import pg from "pg";
import { isDeepStrictEqual } from "node:util";

import type { JsonValue, SourceTime } from "./contracts.js";

export interface PublicFact {
  id: string;
  subjectId: string;
  predicate: string;
  value: JsonValue;
  revisionId: string;
  publishedAt: string;
  reviewedAt: string;
  reviewMethod: "agent-visual-check" | "recorded-reviewer-decision";
  priorFactId?: string;
  source: {
    url: string;
    contentHash: string;
    capturedAt: string;
    locator: string;
    normalizerVersion: string;
    normalizedAt: string;
    recordedAt: string;
    validFrom?: SourceTime;
    sourcePublishedAt?: SourceTime;
  };
}

export interface GeneratedCandidacy {
  personId: string;
  name: string;
  party: string;
  votes: number;
  resultDate?: string;
  sourceUrl: string;
  factIds: string[];
}

export interface Publication {
  revisionId: string | null;
  previousRevisionId: string | null;
  publishedAt: string | null;
  facts: PublicFact[];
  dataset: { candidacies: GeneratedCandidacy[] };
  coverage: "not-assessed";
}

const instant = (value: Date): string => value.toISOString();

function sourceTime(row: pg.QueryResultRow, prefix: string): SourceTime | undefined {
  if (row[`${prefix}_value`] === null) return undefined;
  return {
    value: row[`${prefix}_value`], precision: row[`${prefix}_precision`],
    originalText: row[`${prefix}_original_text`],
    ...(row[`${prefix}_source_timezone`] === null ? {} : { sourceTimezone: row[`${prefix}_source_timezone`] }),
  };
}

function candidacies(facts: readonly PublicFact[]): GeneratedCandidacy[] {
  const rows = new Map<string, Map<string, PublicFact>>();
  for (const fact of facts) {
    const row = /^(page \d+, candidate row \d+), (name|party|votes)$/.exec(fact.source.locator);
    if (!row || !fact.predicate.startsWith("candidate.")) continue;
    const key = `${fact.subjectId}:${fact.source.contentHash}:${row[1]}`;
    const fields = rows.get(key) ?? new Map<string, PublicFact>();
    if (!fields.has(fact.predicate)) fields.set(fact.predicate, fact);
    rows.set(key, fields);
  }
  const complete: GeneratedCandidacy[] = [];
  for (const fields of rows.values()) {
    const name = fields.get("candidate.name");
    const party = fields.get("candidate.party");
    const votes = fields.get("candidate.votesPolled");
    if (!name || !party || !votes || typeof name.value !== "string" ||
      typeof party.value !== "string" || typeof votes.value !== "number") continue;
    complete.push({
      personId: name.subjectId, name: name.value, party: party.value, votes: votes.value,
      sourceUrl: name.source.url,
      ...(votes.source.validFrom?.precision === "day" ? { resultDate: votes.source.validFrom.value } : {}),
      factIds: [name.id, party.id, votes.id],
    });
  }
  return complete;
}

export async function loadPublication(pool: pg.Pool, sourceUrl: string): Promise<Publication> {
  const result = await pool.query(`
    SELECT af.*, p.stable_key, o.locator, o.normalizer_version, o.normalized_at,
      o.recorded_at AS observation_recorded_at, o.valid_from_value, o.valid_from_precision,
      o.valid_from_original_text, o.valid_from_source_timezone,
      o.source_published_at_value, o.source_published_at_precision,
      o.source_published_at_original_text, o.source_published_at_source_timezone,
      s.url, s.content_hash, s.captured_at, r.reviewed_at, r.reviewer_id,
      prior.id AS prior_fact_id, pr.previous_id
    FROM approved_fact af
    JOIN publication_revision pr ON pr.id = af.revision_id
    JOIN person p ON p.id = af.entity_id
    JOIN fact_observation fo ON fo.fact_id = af.id
    JOIN observation o ON o.id = fo.observation_id
    JOIN snapshot s ON s.id = o.snapshot_id
    JOIN LATERAL (
      SELECT rev.reviewed_at, rev.reviewer_id FROM review_observation ro JOIN review_event rev ON rev.id = ro.review_id
      WHERE ro.observation_id = o.id AND rev.decision = 'approved' AND rev.reviewed_at <= af.published_at
      ORDER BY rev.sequence DESC LIMIT 1
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT old.id FROM approved_fact old
      JOIN fact_observation old_fo ON old_fo.fact_id = old.id
      JOIN observation old_o ON old_o.id = old_fo.observation_id
      JOIN snapshot old_s ON old_s.id = old_o.snapshot_id
      WHERE old.entity_id = af.entity_id AND old.predicate = af.predicate
        AND old_s.url = s.url AND old.published_at < af.published_at
      ORDER BY old.published_at DESC, old.recorded_at DESC, old.id DESC LIMIT 1
    ) prior ON true
    WHERE s.url = $1 ORDER BY af.published_at DESC, af.recorded_at DESC, af.id DESC
  `, [sourceUrl]);
  const facts: PublicFact[] = result.rows.map((row) => ({
    id: row.id, subjectId: row.stable_key, predicate: row.predicate, value: row.value,
    revisionId: row.revision_id, publishedAt: instant(row.published_at),
    reviewedAt: instant(row.reviewed_at),
    reviewMethod: row.reviewer_id === "codex-agent-visual-check" ? "agent-visual-check" : "recorded-reviewer-decision",
    ...(row.prior_fact_id ? { priorFactId: row.prior_fact_id } : {}),
    source: {
      url: row.url, contentHash: row.content_hash, capturedAt: instant(row.captured_at),
      locator: row.locator, normalizerVersion: row.normalizer_version,
      normalizedAt: instant(row.normalized_at), recordedAt: instant(row.observation_recorded_at),
      ...(sourceTime(row, "valid_from") ? { validFrom: sourceTime(row, "valid_from") } : {}),
      ...(sourceTime(row, "source_published_at") ? { sourcePublishedAt: sourceTime(row, "source_published_at") } : {}),
    },
  }));
  const latest = result.rows[0];
  return {
    revisionId: latest?.revision_id ?? null,
    previousRevisionId: latest?.previous_id ?? null,
    publishedAt: latest ? instant(latest.published_at) : null,
    facts, dataset: { candidacies: candidacies(facts) }, coverage: "not-assessed",
  };
}

export async function resolvePublicationConflict(
  pool: pg.Pool, observationId: string, priorFactId: string, reviewerId: string, reason: string,
): Promise<void> {
  if (!reviewerId.trim() || !reason.trim()) throw new Error("reviewer and reason are required");
  const result = await pool.query(`
    SELECT o.predicate, o.normalized_value, em.entity_id, af.value AS prior_value, s.url AS source_url
    FROM observation o JOIN snapshot s ON s.id = o.snapshot_id
    JOIN LATERAL (
      SELECT entity_id, status FROM entity_match WHERE observation_id = o.id ORDER BY sequence DESC LIMIT 1
    ) em ON em.status = 'confirmed'
    JOIN approved_fact af ON af.id = $2 AND af.entity_id = em.entity_id AND af.predicate = o.predicate
    JOIN fact_observation fo ON fo.fact_id = af.id
    JOIN observation prior_o ON prior_o.id = fo.observation_id
    JOIN snapshot prior_s ON prior_s.id = prior_o.snapshot_id AND prior_s.url = s.url
    WHERE o.id = $1
  `, [observationId, priorFactId]);
  const row = result.rows[0];
  if (!row || isDeepStrictEqual(row.normalized_value, row.prior_value)) throw new Error("matching conflicting fact not found");
  const latest = await pool.query(`
    SELECT af.id FROM approved_fact af
    JOIN fact_observation fo ON fo.fact_id = af.id
    JOIN observation o ON o.id = fo.observation_id
    JOIN snapshot s ON s.id = o.snapshot_id
    WHERE af.entity_id = $1 AND af.predicate = $2 AND s.url = $3
    ORDER BY af.published_at DESC, af.recorded_at DESC, af.id DESC LIMIT 1
  `, [row.entity_id, row.predicate, row.source_url]);
  if (latest.rows[0]?.id !== priorFactId) throw new Error("prior fact is no longer current");
  await pool.query(`
    INSERT INTO publication_conflict_resolution (observation_id, prior_fact_id, reviewer_id, reason)
    VALUES ($1, $2, $3, $4)
  `, [observationId, priorFactId, reviewerId, reason]);
}

export async function publishApproved(pool: pg.Pool, sourceUrl: string, observationIds: readonly string[]): Promise<Publication> {
  if (!sourceUrl.trim() || !observationIds.length || new Set(observationIds).size !== observationIds.length) {
    throw new Error("source URL and unique observation IDs are required");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await client.query("SELECT pg_advisory_xact_lock(2099941602)");
    const selected = await client.query(`
      SELECT o.*, s.url, em.entity_id, p.stable_key, r.decision,
        prior.id AS prior_fact_id, prior.value AS prior_value,
        cr.id AS resolution_id, existing.fact_id AS existing_fact_id
      FROM observation o JOIN snapshot s ON s.id = o.snapshot_id
      LEFT JOIN LATERAL (
        SELECT entity_id, status FROM entity_match WHERE observation_id = o.id ORDER BY sequence DESC LIMIT 1
      ) em ON em.status = 'confirmed'
      LEFT JOIN person p ON p.id = em.entity_id
      LEFT JOIN LATERAL (
        SELECT rev.decision FROM review_observation ro JOIN review_event rev ON rev.id = ro.review_id
        WHERE ro.observation_id = o.id ORDER BY rev.sequence DESC LIMIT 1
      ) r ON true
      LEFT JOIN LATERAL (
        SELECT af.id, af.value FROM approved_fact af
        JOIN fact_observation fo ON fo.fact_id = af.id
        JOIN observation prior_o ON prior_o.id = fo.observation_id
        JOIN snapshot prior_s ON prior_s.id = prior_o.snapshot_id
        WHERE af.entity_id = em.entity_id AND af.predicate = o.predicate AND prior_s.url = s.url
        ORDER BY af.published_at DESC, af.recorded_at DESC, af.id DESC LIMIT 1
      ) prior ON true
      LEFT JOIN LATERAL (
        SELECT id FROM publication_conflict_resolution
        WHERE observation_id = o.id AND prior_fact_id = prior.id LIMIT 1
      ) cr ON true
      LEFT JOIN fact_observation existing ON existing.observation_id = o.id
      WHERE o.id = ANY($1::uuid[]) AND s.url = $2
    `, [observationIds, sourceUrl]);
    if (selected.rows.length !== observationIds.length) throw new Error("observation not found for source");
    for (const row of selected.rows) {
      if (!row.predicate.startsWith("candidate.") && !row.predicate.startsWith("person.")) throw new Error("entity mapping is not supported for this predicate");
      if (row.existing_fact_id) throw new Error("observation already published");
      if (row.decision !== "approved") throw new Error("observation is not approved");
      if (!row.entity_id || !row.stable_key) throw new Error("confirmed person identity is required");
      if (row.prior_fact_id && !isDeepStrictEqual(row.prior_value, row.normalized_value) && !row.resolution_id) {
        throw new Error("conflict with published value needs recorded resolution");
      }
    }
    const previous = await client.query(`
      SELECT af.revision_id FROM approved_fact af JOIN fact_observation fo ON fo.fact_id = af.id
      JOIN observation o ON o.id = fo.observation_id JOIN snapshot s ON s.id = o.snapshot_id
      WHERE s.url = $1 ORDER BY af.published_at DESC, af.recorded_at DESC LIMIT 1
    `, [sourceUrl]);
    const revision = await client.query(
      "INSERT INTO publication_revision (previous_id) VALUES ($1) RETURNING id, published_at",
      [previous.rows[0]?.revision_id ?? null],
    );
    for (const row of selected.rows) {
      const fact = await client.query(`
        INSERT INTO approved_fact (entity_id, predicate, value, revision_id, published_at)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `, [row.entity_id, row.predicate, JSON.stringify(row.normalized_value), revision.rows[0].id, revision.rows[0].published_at]);
      await client.query("INSERT INTO fact_observation (fact_id, observation_id) VALUES ($1, $2)", [fact.rows[0].id, row.id]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return loadPublication(pool, sourceUrl);
}
