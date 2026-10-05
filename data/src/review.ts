import pg from "pg";
import { isDeepStrictEqual } from "node:util";

import type { JsonValue, ReviewDecision } from "./contracts.js";
import { CivicStore } from "./store.js";

export interface ReviewCase {
  id: string;
  observationId: string;
  predicate: string;
  value: JsonValue;
  locator: string;
  sourceUrl: string;
  contentHash: string;
  capturedAt: string;
  recordedAt: string;
  coverage: "not-assessed";
  state: "ready" | "identity-unresolved" | "conflict";
  entityId?: string;
  previousValue?: JsonValue;
}

function required(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}

export class CivicReview {
  private readonly store: CivicStore;

  constructor(private readonly pool: pg.Pool) {
    this.store = new CivicStore(pool);
  }

  async queueForReview(observationIds: readonly string[]): Promise<ReviewCase[]> {
    if (!observationIds.length || new Set(observationIds).size !== observationIds.length) {
      throw new Error("unique observation IDs are required");
    }
    const result = await this.pool.query(`
      SELECT o.*, s.url AS source_url, s.content_hash, s.captured_at,
        em.entity_id, em.status AS match_status, af.value AS previous_value
      FROM observation o
      JOIN snapshot s ON s.id = o.snapshot_id
      LEFT JOIN LATERAL (
        SELECT entity_id, status FROM entity_match
        WHERE observation_id = o.id ORDER BY sequence DESC LIMIT 1
      ) em ON true
      LEFT JOIN LATERAL (
        SELECT value FROM approved_fact
        WHERE entity_id = em.entity_id AND predicate = o.predicate
        ORDER BY published_at DESC, recorded_at DESC, id DESC LIMIT 1
      ) af ON true
      WHERE o.id = ANY($1::uuid[])
    `, [observationIds]);
    if (result.rows.length !== observationIds.length) throw new Error("observation not found");
    const byId = new Map<string, ReviewCase>();
    for (const row of result.rows) {
      const identityNeeded = row.predicate.startsWith("candidate.") || row.predicate.startsWith("person.");
      const matched = row.match_status === "confirmed" && row.entity_id !== null;
      const conflict = row.previous_value !== null && !isDeepStrictEqual(row.previous_value, row.normalized_value);
      byId.set(row.id, {
        id: row.id, observationId: row.id, predicate: row.predicate,
        value: row.normalized_value, locator: row.locator, sourceUrl: row.source_url,
        contentHash: row.content_hash, recordedAt: (row.recorded_at as Date).toISOString(),
        capturedAt: (row.captured_at as Date).toISOString(),
        coverage: "not-assessed",
        state: identityNeeded && !matched ? "identity-unresolved" : conflict ? "conflict" : "ready",
        ...(matched ? { entityId: row.entity_id } : {}),
        ...(row.previous_value !== null ? { previousValue: row.previous_value } : {}),
      });
    }
    return observationIds.map((id) => byId.get(id)!);
  }

  async confirmIdentity(observationId: string, entityId: string, reviewerId: string, reason: string): Promise<void> {
    for (const [value, label] of [[reviewerId, "reviewer"], [reason, "reason"]]) required(value, label);
    const person = await this.pool.query("SELECT 1 FROM person WHERE id = $1", [entityId]);
    if (!person.rowCount) throw new Error("known person not found");
    const obs = await this.pool.query("SELECT predicate FROM observation WHERE id = $1", [observationId]);
    if (!obs.rowCount || !/^(candidate|person)\./.test(obs.rows[0].predicate)) throw new Error("person observation not found");
    await this.pool.query(
      `INSERT INTO entity_match (observation_id, entity_id, status, reason, reviewer_id)
       VALUES ($1, $2, 'confirmed', $3, $4)`,
      [observationId, entityId, reason, reviewerId],
    );
  }

  async decide(caseId: string, decision: ReviewDecision["decision"], reviewerId: string, reason: string): Promise<ReviewDecision> {
    required(reviewerId, "reviewer");
    required(reason, "reason");
    if (decision === "approved") return this.approve(caseId, reviewerId, reason);
    await this.queueForReview([caseId]);
    return this.store.recordDecision([caseId], decision, reviewerId, reason);
  }

  async approve(caseId: string, reviewerId: string, reason: string): Promise<ReviewDecision> {
    required(reviewerId, "reviewer");
    required(reason, "reason");
    const [item] = await this.queueForReview([caseId]);
    if (item.state === "identity-unresolved") throw new Error("identity must be confirmed before approval");
    if (item.state === "conflict") throw new Error("conflict with published value needs resolution");
    return this.store.recordDecision([caseId], "approved", reviewerId, reason);
  }

  async history(observationId: string): Promise<ReviewDecision[]> {
    const result = await this.pool.query(`
      SELECT r.* FROM review_event r JOIN review_observation ro ON ro.review_id = r.id
      WHERE ro.observation_id = $1 ORDER BY r.sequence
    `, [observationId]);
    return result.rows.map((row) => ({
      id: row.id, observationIds: [observationId], decision: row.decision,
      reviewerId: row.reviewer_id, reason: row.reason,
      reviewedAt: (row.reviewed_at as Date).toISOString(),
      recordedAt: (row.recorded_at as Date).toISOString(),
    }));
  }
}
