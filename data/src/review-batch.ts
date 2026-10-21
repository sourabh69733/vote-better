import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { migrate } from "./migrate.js";
import { ECI_GE2024_DETAILED_RESULT_NORMALIZER_VERSION, ECI_GE2024_DETAILED_RESULT_URL } from "./normalize/eci-ge2024-detailed-result.js";

// Only official structured datasets whose normalizer runs automatic consistency
// checks may be approved as one batch. Everything else stays per-fact review.
export const BATCH_REVIEW_SOURCES: Record<string, { normalizerVersion: string; predicate: string }> = {
  [ECI_GE2024_DETAILED_RESULT_URL]: { normalizerVersion: ECI_GE2024_DETAILED_RESULT_NORMALIZER_VERSION, predicate: "candidate.result" },
};

export interface BatchReviewResult {
  snapshotId: string;
  observations: number;
  peopleCreated: number;
  identitiesConfirmed: number;
  approved: number;
  reviewId: string | null;
}

export async function approveSnapshotBatch(
  pool: pg.Pool, sourceUrl: string, reviewerId: string, reason: string,
): Promise<BatchReviewResult> {
  const rule = BATCH_REVIEW_SOURCES[sourceUrl];
  if (!rule) throw new Error("source is not approved for batch review");
  if (!reviewerId.trim() || !reason.trim()) throw new Error("reviewer and reason are required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    const snapshot = await client.query(
      `SELECT s.id FROM snapshot s JOIN source src ON src.id = s.source_id
       WHERE src.url = $1 ORDER BY s.captured_at DESC, s.recorded_at DESC LIMIT 1`, [sourceUrl],
    );
    if (!snapshot.rowCount) throw new Error("no snapshot for source");
    const snapshotId: string = snapshot.rows[0].id;
    const rows = await client.query(`
      SELECT o.id, o.normalized_value, em.status AS match_status, rev.decision,
        prior.value AS prior_value
      FROM observation o
      LEFT JOIN LATERAL (
        SELECT status FROM entity_match WHERE observation_id = o.id ORDER BY sequence DESC LIMIT 1
      ) em ON true
      LEFT JOIN LATERAL (
        SELECT r.decision FROM review_observation ro JOIN review_event r ON r.id = ro.review_id
        WHERE ro.observation_id = o.id ORDER BY r.sequence DESC LIMIT 1
      ) rev ON true
      LEFT JOIN LATERAL (
        SELECT af.value FROM approved_fact af
        JOIN person p ON p.id = af.entity_id AND p.stable_key = o.normalized_value->>'personKey'
        JOIN fact_observation fo ON fo.fact_id = af.id
        JOIN observation prior_o ON prior_o.id = fo.observation_id
        JOIN snapshot prior_s ON prior_s.id = prior_o.snapshot_id AND prior_s.url = $4
        WHERE af.predicate = o.predicate
        ORDER BY af.published_at DESC, af.recorded_at DESC LIMIT 1
      ) prior ON true
      WHERE o.snapshot_id = $1 AND o.normalizer_version = $2 AND o.predicate = $3
      ORDER BY o.locator
    `, [snapshotId, rule.normalizerVersion, rule.predicate, sourceUrl]);
    if (!rows.rowCount) throw new Error("snapshot has no observations for this normalizer");
    const conflicts = rows.rows.filter((row) => row.prior_value !== null &&
      JSON.stringify(row.prior_value) !== JSON.stringify(row.normalized_value));
    if (conflicts.length) throw new Error(`${conflicts.length} result(s) differ from published facts; review them individually`);

    const people = await client.query(`
      INSERT INTO person (stable_key, display_name)
      SELECT key, name FROM unnest($1::text[], $2::text[]) AS input(key, name)
      ON CONFLICT (stable_key) DO NOTHING RETURNING id
    `, [rows.rows.map((row) => row.normalized_value.personKey), rows.rows.map((row) => row.normalized_value.name)]);

    const unmatched = rows.rows.filter((row) => row.match_status !== "confirmed");
    if (unmatched.length) {
      await client.query(`
        INSERT INTO entity_match (observation_id, entity_id, status, reason, reviewer_id)
        SELECT o.id, p.id, 'confirmed', $2, $3
        FROM unnest($1::uuid[]) AS input(id)
        JOIN observation o ON o.id = input.id
        JOIN person p ON p.stable_key = o.normalized_value->>'personKey'
      `, [unmatched.map((row) => row.id),
        "Person record for this candidacy, keyed by election, state, seat and name. Not yet linked to other records.", reviewerId]);
    }

    const pending = rows.rows.filter((row) => row.decision !== "approved").map((row) => row.id);
    let reviewId: string | null = null;
    if (pending.length) {
      const review = await client.query(
        "INSERT INTO review_event (decision, reviewer_id, reason) VALUES ('approved', $1, $2) RETURNING id",
        [reviewerId, reason],
      );
      reviewId = review.rows[0].id;
      await client.query(
        "INSERT INTO review_observation (review_id, observation_id) SELECT $1, id FROM unnest($2::uuid[]) AS input(id)",
        [reviewId, pending],
      );
    }
    await client.query("COMMIT");
    return {
      snapshotId, observations: rows.rowCount ?? 0, peopleCreated: people.rowCount ?? 0,
      identitiesConfirmed: unmatched.length, approved: pending.length, reviewId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [sourceUrl = ECI_GE2024_DETAILED_RESULT_URL] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const option = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better",
  });
  try {
    await migrate(pool);
    const result = await approveSnapshotBatch(pool, sourceUrl, option("reviewer"), option("reason"));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
