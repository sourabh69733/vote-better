import pg from "pg";
import { isDeepStrictEqual } from "node:util";

import {
  assertObservation,
  assertSnapshot,
  assertSource,
  isUtcInstant,
  type Observation,
  type ReviewDecision,
  type Snapshot,
  type Source,
  type SourceTime,
} from "./contracts.js";

export type ObservationDraft = Omit<Observation, "id" | "recordedAt" | "snapshotId">;

export type CollectionOutcome = "succeeded" | "unavailable" | "invalid" | "error";

export interface CollectionAttempt {
  id: string;
  sourceId: string;
  snapshotId?: string;
  attemptedAt: string;
  outcome: CollectionOutcome;
  httpStatus?: number;
  detail?: string;
  recordedAt: string;
}

function instant(value: Date): string {
  return value.toISOString();
}

function sourceFromRow(row: pg.QueryResultRow): Source {
  return {
    id: row.id, authority: row.authority, url: row.url, documentType: row.document_type,
    recordedAt: instant(row.recorded_at),
  };
}

function snapshotFromRow(row: pg.QueryResultRow): Snapshot {
  return {
    id: row.id, sourceId: row.source_id, url: row.url, contentHash: row.content_hash,
    capturedAt: instant(row.captured_at), blobRef: row.blob_ref ?? undefined,
    recordedAt: instant(row.recorded_at),
  };
}

function sourceTimeFromRow(row: pg.QueryResultRow, prefix: string): SourceTime | undefined {
  if (row[`${prefix}_value`] === null) return undefined;
  return {
    value: row[`${prefix}_value`], precision: row[`${prefix}_precision`],
    originalText: row[`${prefix}_original_text`],
    ...(row[`${prefix}_source_timezone`] === null ? {} : { sourceTimezone: row[`${prefix}_source_timezone`] }),
  };
}

function observationFromRow(row: pg.QueryResultRow): Observation {
  return {
    id: row.id, snapshotId: row.snapshot_id, locator: row.locator, predicate: row.predicate,
    rawValue: row.raw_value, normalizedValue: row.normalized_value,
    validFrom: sourceTimeFromRow(row, "valid_from"),
    validTo: sourceTimeFromRow(row, "valid_to"),
    sourcePublishedAt: sourceTimeFromRow(row, "source_published_at"),
    normalizedAt: instant(row.normalized_at), normalizerVersion: row.normalizer_version,
    recordedAt: instant(row.recorded_at),
  };
}

function timeValues(value?: SourceTime): (string | null)[] {
  return [value?.value ?? null, value?.precision ?? null, value?.originalText ?? null, value?.sourceTimezone ?? null];
}

function sameDraft(existing: Observation, draft: ObservationDraft): boolean {
  return existing.rawValue === draft.rawValue &&
    isDeepStrictEqual(existing.normalizedValue, draft.normalizedValue) &&
    isDeepStrictEqual(existing.validFrom, draft.validFrom) &&
    isDeepStrictEqual(existing.validTo, draft.validTo) &&
    isDeepStrictEqual(existing.sourcePublishedAt, draft.sourcePublishedAt);
}

export class CivicStore {
  constructor(private readonly pool: pg.Pool) {}

  async saveSource(input: Pick<Source, "authority" | "url" | "documentType">): Promise<Source> {
    assertSource({ ...input, id: "pending", recordedAt: new Date().toISOString() });
    const inserted = await this.pool.query(
      `INSERT INTO source (authority, url, document_type) VALUES ($1, $2, $3)
       ON CONFLICT (url) DO NOTHING RETURNING *`,
      [input.authority, input.url, input.documentType],
    );
    const row = inserted.rows[0] ?? (await this.pool.query("SELECT * FROM source WHERE url = $1", [input.url])).rows[0];
    const source = sourceFromRow(row);
    if (source.authority !== input.authority || source.documentType !== input.documentType) {
      throw new Error("source URL already exists with different metadata");
    }
    return source;
  }

  async saveSnapshot(sourceId: string, url: string, contentHash: string, capturedAt: string, blobRef?: string): Promise<Snapshot> {
    assertSnapshot({ id: "pending", recordedAt: new Date().toISOString(), sourceId, url, contentHash, capturedAt, blobRef });
    const inserted = await this.pool.query(
      `INSERT INTO snapshot (source_id, url, content_hash, captured_at, blob_ref)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (source_id, content_hash) DO NOTHING RETURNING *`,
      [sourceId, url, contentHash, capturedAt, blobRef ?? null],
    );
    const row = inserted.rows[0] ?? (await this.pool.query(
      "SELECT * FROM snapshot WHERE source_id = $1 AND content_hash = $2", [sourceId, contentHash],
    )).rows[0];
    return snapshotFromRow(row);
  }

  async recordCollectionAttempt(input: Omit<CollectionAttempt, "id" | "recordedAt">): Promise<CollectionAttempt> {
    if (!input.sourceId || !isUtcInstant(input.attemptedAt)) throw new Error("collection attempt needs source and UTC attemptedAt");
    if (!["succeeded", "unavailable", "invalid", "error"].includes(input.outcome)) throw new Error("invalid collection outcome");
    if (input.outcome === "succeeded" && !input.snapshotId) throw new Error("successful collection needs a snapshot");
    const result = await this.pool.query(
      `INSERT INTO collection_attempt (source_id, snapshot_id, attempted_at, outcome, http_status, detail)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.sourceId, input.snapshotId ?? null, input.attemptedAt, input.outcome,
        input.httpStatus ?? null, input.detail ?? null],
    );
    const row = result.rows[0];
    return {
      id: row.id, sourceId: row.source_id, snapshotId: row.snapshot_id ?? undefined,
      attemptedAt: instant(row.attempted_at), outcome: row.outcome,
      httpStatus: row.http_status ?? undefined, detail: row.detail ?? undefined,
      recordedAt: instant(row.recorded_at),
    };
  }

  async saveObservations(snapshotId: string, drafts: readonly ObservationDraft[]): Promise<Observation[]> {
    for (const draft of drafts) {
      assertObservation({ ...draft, id: "pending", recordedAt: new Date().toISOString(), snapshotId });
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const saved: Observation[] = [];
      for (const draft of drafts) {
        const inserted = await client.query(
          `INSERT INTO observation (
            snapshot_id, locator, predicate, raw_value, normalized_value,
            valid_from_value, valid_from_precision, valid_from_original_text, valid_from_source_timezone,
            valid_to_value, valid_to_precision, valid_to_original_text, valid_to_source_timezone,
            source_published_at_value, source_published_at_precision, source_published_at_original_text, source_published_at_source_timezone,
            normalized_at, normalizer_version
          ) VALUES (${Array.from({ length: 19 }, (_, i) => `$${i + 1}`).join(", ")})
          ON CONFLICT (snapshot_id, locator, predicate, normalizer_version) DO NOTHING RETURNING *`,
          [snapshotId, draft.locator, draft.predicate, draft.rawValue, JSON.stringify(draft.normalizedValue),
            ...timeValues(draft.validFrom), ...timeValues(draft.validTo), ...timeValues(draft.sourcePublishedAt),
            draft.normalizedAt, draft.normalizerVersion],
        );
        const row = inserted.rows[0] ?? (await client.query(
          `SELECT * FROM observation WHERE snapshot_id = $1 AND locator = $2 AND predicate = $3 AND normalizer_version = $4`,
          [snapshotId, draft.locator, draft.predicate, draft.normalizerVersion],
        )).rows[0];
        const observation = observationFromRow(row);
        if (!sameDraft(observation, draft)) throw new Error(`observation conflicts with saved row at ${draft.locator}`);
        saved.push(observation);
      }
      await client.query("COMMIT");
      return saved;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordDecision(
    observationIds: readonly string[], decision: ReviewDecision["decision"], reviewerId: string, reason: string,
  ): Promise<ReviewDecision> {
    if (observationIds.length === 0 || new Set(observationIds).size !== observationIds.length) {
      throw new Error("review requires unique observation IDs");
    }
    if (!["approved", "rejected", "needs-changes"].includes(decision) || !reviewerId.trim() || !reason.trim()) {
      throw new Error("review decision, reviewer, and reason are required");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO review_event (decision, reviewer_id, reason) VALUES ($1, $2, $3) RETURNING *`,
        [decision, reviewerId, reason],
      );
      const row = result.rows[0];
      for (const observationId of observationIds) {
        await client.query(
          "INSERT INTO review_observation (review_id, observation_id) VALUES ($1, $2)",
          [row.id, observationId],
        );
      }
      await client.query("COMMIT");
      return {
        id: row.id, recordedAt: instant(row.recorded_at), observationIds: [...observationIds],
        decision: row.decision, reviewerId: row.reviewer_id, reason: row.reason,
        reviewedAt: instant(row.reviewed_at),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listPublicationCandidates(): Promise<Observation[]> {
    const result = await this.pool.query(`
      SELECT o.* FROM observation o
      JOIN LATERAL (
        SELECT r.decision FROM review_observation ro
        JOIN review_event r ON r.id = ro.review_id
        WHERE ro.observation_id = o.id
        ORDER BY r.sequence DESC LIMIT 1
      ) latest ON latest.decision = 'approved'
      LEFT JOIN LATERAL (
        SELECT entity_id, status FROM entity_match
        WHERE observation_id = o.id ORDER BY sequence DESC LIMIT 1
      ) em ON true
      LEFT JOIN LATERAL (
        SELECT value FROM approved_fact
        WHERE entity_id = em.entity_id AND predicate = o.predicate
        ORDER BY published_at DESC, recorded_at DESC, id DESC LIMIT 1
      ) prior ON true
      WHERE em.status = 'confirmed' AND em.entity_id IS NOT NULL
        AND (prior.value IS NULL OR prior.value = o.normalized_value)
      ORDER BY o.recorded_at, o.id
    `);
    return result.rows.map(observationFromRow);
  }
}
