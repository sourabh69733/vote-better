import pg from "pg";

import { isUtcInstant, type CoverageState } from "./contracts.js";
import type { CollectionOutcome } from "./store.js";
import { CivicReview } from "./review.js";

export interface CoverageInput {
  areaId: string;
  factType: string;
  sourceUrl: string;
  computedAt: string;
  snapshot?: { capturedAt: string; contentHash: string; candidateRows: number };
  publishedCandidateRows: number;
  lastAttempt?: { attemptedAt: string; outcome: CollectionOutcome };
  lastReviewedAt?: string;
  lastPublishedAt?: string;
  unresolvedConflicts: number;
}

export interface CoverageReport {
  areaId: string;
  factType: string;
  sourceUrl: string;
  state: CoverageState;
  reason: string;
  observedCandidateRows: number | null;
  publishedCandidateRows: number;
  lastAttemptOutcome?: CollectionOutcome;
  lastAttemptedAt?: string;
  lastCapturedAt?: string;
  lastReviewedAt?: string;
  lastPublishedAt?: string;
  sourceContentHash?: string;
  computedAt: string;
}

export function assessCoverage(input: CoverageInput): CoverageReport {
  if (!input.areaId || !input.factType || !input.sourceUrl || !isUtcInstant(input.computedAt)) {
    throw new Error("coverage needs area, fact type, source and UTC computed time");
  }
  if (input.publishedCandidateRows < 0 || input.unresolvedConflicts < 0 ||
    (input.snapshot && (input.snapshot.candidateRows < 0 || input.publishedCandidateRows > input.snapshot.candidateRows))) {
    throw new Error("invalid candidate coverage counts");
  }
  let state: CoverageState;
  let reason: string;
  if (!input.snapshot || input.snapshot.candidateRows === 0) {
    state = "missing";
    reason = input.lastAttempt && input.lastAttempt.outcome !== "succeeded"
      ? "The latest source check did not provide usable result rows."
      : "No candidate result rows have been captured from this source.";
  } else if (input.unresolvedConflicts > 0) {
    state = "disputed";
    reason = "A newer observation conflicts with a published result and needs review.";
  } else if (input.lastAttempt && input.lastAttempt.outcome !== "succeeded" &&
    input.lastAttempt.attemptedAt > input.snapshot.capturedAt && input.publishedCandidateRows > 0) {
    state = "stale";
    reason = "The latest source check failed; previously published results remain visible.";
  } else if (input.publishedCandidateRows === input.snapshot.candidateRows) {
    state = "covered";
    reason = "Every candidate result row captured from this source has been published.";
  } else {
    state = "partial";
    reason = "Some candidate result rows from this source are still awaiting review or publication.";
  }
  return {
    areaId: input.areaId, factType: input.factType, sourceUrl: input.sourceUrl,
    state, reason,
    observedCandidateRows: input.snapshot?.candidateRows ?? null,
    publishedCandidateRows: input.publishedCandidateRows,
    ...(input.lastAttempt ? { lastAttemptOutcome: input.lastAttempt.outcome, lastAttemptedAt: input.lastAttempt.attemptedAt } : {}),
    ...(input.snapshot ? { lastCapturedAt: input.snapshot.capturedAt, sourceContentHash: input.snapshot.contentHash } : {}),
    ...(input.lastReviewedAt ? { lastReviewedAt: input.lastReviewedAt } : {}),
    ...(input.lastPublishedAt ? { lastPublishedAt: input.lastPublishedAt } : {}),
    computedAt: input.computedAt,
  };
}

export async function getSourceCoverage(
  pool: pg.Pool, areaId: string, factType: string, sourceUrl: string,
): Promise<CoverageReport> {
  const source = await pool.query("SELECT id FROM source WHERE url = $1", [sourceUrl]);
  const sourceId = source.rows[0]?.id as string | undefined;
  const base: CoverageInput = {
    areaId, factType, sourceUrl, computedAt: new Date().toISOString(),
    publishedCandidateRows: 0, unresolvedConflicts: 0,
  };
  if (!sourceId) return assessCoverage(base);

  const [snapshots, attempts, timestamps] = await Promise.all([
    pool.query("SELECT id, captured_at, content_hash FROM snapshot WHERE source_id = $1 ORDER BY captured_at DESC, recorded_at DESC LIMIT 1", [sourceId]),
    pool.query("SELECT attempted_at, outcome FROM collection_attempt WHERE source_id = $1 ORDER BY attempted_at DESC, recorded_at DESC LIMIT 1", [sourceId]),
    pool.query(`
      SELECT
        (SELECT max(r.reviewed_at) FROM review_event r JOIN review_observation ro ON ro.review_id = r.id
         JOIN observation o ON o.id = ro.observation_id JOIN snapshot s ON s.id = o.snapshot_id
         WHERE s.source_id = $1) AS last_reviewed_at,
        (SELECT max(af.published_at) FROM approved_fact af JOIN fact_observation fo ON fo.fact_id = af.id
         JOIN observation o ON o.id = fo.observation_id JOIN snapshot s ON s.id = o.snapshot_id
         WHERE s.source_id = $1) AS last_published_at
    `, [sourceId]),
  ]);
  const attempt = attempts.rows[0];
  if (attempt) base.lastAttempt = { attemptedAt: (attempt.attempted_at as Date).toISOString(), outcome: attempt.outcome };
  const times = timestamps.rows[0];
  if (times.last_reviewed_at) base.lastReviewedAt = (times.last_reviewed_at as Date).toISOString();
  if (times.last_published_at) base.lastPublishedAt = (times.last_published_at as Date).toISOString();
  const snapshot = snapshots.rows[0];
  if (!snapshot) return assessCoverage(base);

  const observations = await pool.query(`
    SELECT o.id, o.locator, o.predicate,
      EXISTS (SELECT 1 FROM fact_observation fo WHERE fo.observation_id = o.id) AS published
    FROM observation o WHERE o.snapshot_id = $1 AND o.predicate IN
      ('candidate.name', 'candidate.party', 'candidate.votesPolled')
  `, [snapshot.id]);
  const rows = new Map<string, { fields: Set<string>; published: Set<string> }>();
  const ids: string[] = [];
  for (const item of observations.rows) {
    const row = /^(page \d+, candidate row \d+), (name|party|votes)$/.exec(item.locator);
    if (!row) continue;
    ids.push(item.id);
    const entry = rows.get(row[1]) ?? { fields: new Set<string>(), published: new Set<string>() };
    entry.fields.add(item.predicate);
    if (item.published) entry.published.add(item.predicate);
    rows.set(row[1], entry);
  }
  base.snapshot = { capturedAt: (snapshot.captured_at as Date).toISOString(), contentHash: snapshot.content_hash, candidateRows: rows.size };
  base.publishedCandidateRows = [...rows.values()].filter((row) => row.published.size === 3).length;
  if (ids.length) {
    const cases = await new CivicReview(pool).queueForReview(ids);
    base.unresolvedConflicts = cases.filter((item) => item.state === "conflict").length;
  }
  return assessCoverage(base);
}
