import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { CivicReview } from "./review.js";
import { CivicStore } from "./store.js";

type Queryable = Pick<pg.Pool, "query">;

export interface ProfileReviewObservation {
  id: string;
  predicate: string;
  locator: string;
  value: unknown;
  sourceUrl: string;
  snapshotId: string;
}

export interface ProfileReviewReport {
  memberId: number;
  name: string;
  rosterName: string;
  token: string;
  sources: { url: string; snapshotId: string; contentHash: string; capturedAt: string }[];
  observations: ProfileReviewObservation[];
}

function urls(memberId: number): readonly string[] {
  if (!Number.isSafeInteger(memberId) || memberId < 1) throw new Error("invalid Sansad member ID");
  return [`https://sansad.in/api_ls/member/${memberId}?locale=en`,
    `https://sansad.in/api_ls/member/positionHeld?mpCode=${memberId}&locale=en`];
}

function canonicalName(value: string): string {
  return value.trim().replace(/^(?:(?:smt|shri|dr|mr|mrs|ms|prof|adv|thiru|chh|km|md|com)\.?\s+)+/i, "")
    .replace(/\s+/g, " ").toLocaleLowerCase("en-IN");
}

export async function loadProfileReview(db: Queryable, memberId: number): Promise<ProfileReviewReport> {
  const sourceUrls = urls(memberId);
  const snapshots = await db.query(`
    SELECT DISTINCT ON (s.url) s.id, s.url, s.content_hash, s.captured_at
    FROM snapshot s JOIN source src ON src.id = s.source_id
    WHERE s.url = ANY($1::text[]) AND src.authority = 'Parliament of India'
    ORDER BY s.url, s.captured_at DESC, s.recorded_at DESC, s.id DESC
  `, [sourceUrls]);
  if (snapshots.rows.length !== 2) throw new Error("both Sansad biography sources must be collected");
  const snapshotIds = snapshots.rows.map((row) => row.id as string);
  const result = await db.query(`
    SELECT o.id, o.predicate, o.locator, o.normalized_value, o.snapshot_id, o.normalizer_version, s.url
    FROM observation o JOIN snapshot s ON s.id = o.snapshot_id
    WHERE o.snapshot_id = ANY($1::uuid[])
      AND o.normalizer_version IN ('sansad-ls-biography-v1', 'sansad-ls-biography-v2', 'sansad-ls-positions-v2', 'sansad-ls-positions-v3', 'sansad-ls-positions-v4')
    ORDER BY s.url, o.locator, o.predicate, o.id
  `, [snapshotIds]);
  const positionsVersion = ["sansad-ls-positions-v4", "sansad-ls-positions-v3", "sansad-ls-positions-v2"]
    .find((version) => result.rows.some((row) => row.normalizer_version === version));
  const biographyVersion = result.rows.some((row) => row.normalizer_version === "sansad-ls-biography-v2")
    ? "sansad-ls-biography-v2" : "sansad-ls-biography-v1";
  const currentRows = result.rows.filter((row) => row.predicate === "office.positionsHeld"
    ? row.normalizer_version === positionsVersion : row.normalizer_version === biographyVersion);
  const observations: ProfileReviewObservation[] = currentRows.map((row) => ({
    id: row.id, predicate: row.predicate, locator: row.locator, value: row.normalized_value,
    sourceUrl: row.url, snapshotId: row.snapshot_id,
  }));
  const idClaims = observations.filter((item) => item.predicate === "person.sansadMemberId");
  const names = observations.filter((item) => item.predicate === "person.name");
  const positions = observations.filter((item) => item.predicate === "office.positionsHeld");
  if (idClaims.length !== 1 || idClaims[0].value !== String(memberId) ||
      names.length !== 1 || typeof names[0].value !== "string" || !names[0].value.trim() ||
      positions.length !== 1 || !Array.isArray(positions[0].value)) {
    throw new Error("incomplete or inconsistent biography observations");
  }
  const roster = await db.query(`
    SELECT s.id AS snapshot_id, s.url, s.content_hash, s.captured_at,
      name.normalized_value AS name, member.normalized_value AS member_id
    FROM observation member
    JOIN snapshot s ON s.id = member.snapshot_id
    JOIN source src ON src.id = s.source_id
    JOIN observation name ON name.snapshot_id = s.id
      AND name.locator = $2 AND name.predicate = 'person.name'
      AND name.normalizer_version = 'sansad-ls-members-v1'
    WHERE member.locator = $1 AND member.predicate = 'person.sansadMemberId'
      AND member.normalizer_version = 'sansad-ls-members-v1'
      AND src.authority = 'Parliament of India'
      AND s.url LIKE 'https://sansad.in/api_ls/member?%'
    ORDER BY s.captured_at DESC, s.recorded_at DESC, s.id DESC LIMIT 1
  `, [`membersDtoList[mpsno=${memberId}].mpsno`, `membersDtoList[mpsno=${memberId}].mpFirstLastName`]);
  const rosterRow = roster.rows[0];
  if (!rosterRow || rosterRow.member_id !== String(memberId) || typeof rosterRow.name !== "string" ||
      canonicalName(rosterRow.name) !== canonicalName(names[0].value)) {
    throw new Error("official roster identity conflicts with biography");
  }
  const sources = snapshots.rows.map((row) => ({ url: row.url as string, snapshotId: row.id as string,
    contentHash: row.content_hash as string, capturedAt: (row.captured_at as Date).toISOString() }));
  sources.push({ url: rosterRow.url, snapshotId: rosterRow.snapshot_id,
    contentHash: rosterRow.content_hash, capturedAt: (rosterRow.captured_at as Date).toISOString() });
  const token = createHash("sha256").update(JSON.stringify({ memberId, sources, observations, rosterName: rosterRow.name })).digest("hex");
  return { memberId, name: names[0].value, rosterName: rosterRow.name, token, sources, observations };
}

export async function linkProfileIdentity(
  pool: pg.Pool, memberId: number, entityId: string, expectedToken: string, reviewerId: string, reason: string,
): Promise<number> {
  if (!entityId.trim() || !reviewerId.trim() || !reason.trim()) throw new Error("person, reviewer and reason are required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(2099941603)");
    const report = await loadProfileReview(client, memberId);
    if (report.token !== expectedToken) throw new Error("review token is stale or incorrect");
    const person = await client.query("SELECT display_name FROM person WHERE id = $1", [entityId]);
    if (!person.rowCount || canonicalName(person.rows[0].display_name) !== canonicalName(report.name)) {
      throw new Error("person name does not match the official biography");
    }
    const conflictingId = await client.query(`
      SELECT o.normalized_value, em.entity_id FROM entity_match em
      JOIN observation o ON o.id = em.observation_id
      WHERE em.status = 'confirmed' AND o.predicate = 'person.sansadMemberId'
        AND ((o.normalized_value = to_jsonb($1::text) AND em.entity_id <> $2)
          OR (em.entity_id = $2 AND o.normalized_value <> to_jsonb($1::text)))
      LIMIT 1
    `, [String(memberId), entityId]);
    if (conflictingId.rowCount) throw new Error("official member ID conflicts with an existing identity link");
    let linked = 0;
    for (const observation of report.observations) {
      const latest = await client.query(`
        SELECT entity_id, status FROM entity_match WHERE observation_id = $1
        ORDER BY sequence DESC LIMIT 1
      `, [observation.id]);
      if (latest.rows[0]?.status === "confirmed" && latest.rows[0].entity_id === entityId) continue;
      if (latest.rows[0]?.entity_id && latest.rows[0].entity_id !== entityId) {
        throw new Error("observation has a conflicting person match");
      }
      await client.query(`INSERT INTO entity_match (observation_id, entity_id, status, reason, reviewer_id)
        VALUES ($1, $2, 'confirmed', $3, $4)`, [observation.id, entityId, reason, reviewerId]);
      linked += 1;
    }
    await client.query("COMMIT");
    return linked;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function approveProfileFields(
  pool: pg.Pool, memberId: number, expectedToken: string, predicates: readonly string[],
  reviewerId: string, reason: string,
): Promise<number> {
  if (!reviewerId.trim() || !reason.trim() || !predicates.length || new Set(predicates).size !== predicates.length) {
    throw new Error("reviewer, reason and unique selected fields are required");
  }
  const report = await loadProfileReview(pool, memberId);
  if (report.token !== expectedToken) throw new Error("review token is stale or incorrect");
  const selected = report.observations.filter((item) => predicates.includes(item.predicate));
  if (new Set(selected.map((item) => item.predicate)).size !== predicates.length) {
    throw new Error("selected field is not in this profile report");
  }
  const ids = selected.map((item) => item.id);
  const review = new CivicReview(pool);
  const cases = await review.queueForReview(ids);
  if (cases.some((item) => item.state === "identity-unresolved")) throw new Error("identity must be confirmed first");
  if (cases.some((item) => item.state === "conflict")) throw new Error("published conflict needs resolution first");
  const previous = await pool.query(`
    SELECT ro.observation_id, latest.decision FROM review_observation ro
    JOIN LATERAL (
      SELECT r.decision FROM review_observation ro2 JOIN review_event r ON r.id = ro2.review_id
      WHERE ro2.observation_id = ro.observation_id ORDER BY r.sequence DESC LIMIT 1
    ) latest ON true
    WHERE ro.observation_id = ANY($1::uuid[])
  `, [ids]);
  if (previous.rows.some((row) => row.decision === "approved")) throw new Error("field already approved");
  await new CivicStore(pool).recordDecision(ids, "approved", reviewerId, reason);
  return ids.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    const [command, idText, ...rest] = process.argv.slice(2);
    const memberId = Number(idText);
    if (!idText || !Number.isSafeInteger(memberId) || memberId < 1) throw new Error("valid member ID required");
    if (command === "report" && !rest.length) {
      process.stdout.write(`${JSON.stringify(await loadProfileReview(pool, memberId), null, 2)}\n`);
    } else if (command === "link" && rest.length >= 4) {
      const [personKey, token, reviewerId, ...reasonParts] = rest;
      const person = await pool.query("SELECT id FROM person WHERE stable_key = $1", [personKey]);
      if (!person.rowCount) throw new Error("person stable key not found; create or select a person first");
      const count = await linkProfileIdentity(pool, memberId, person.rows[0].id, token, reviewerId, reasonParts.join(" "));
      process.stdout.write(`Confirmed ${count} new identity link(s). Observations still require fact review.\n`);
    } else if (command === "approve" && rest.length >= 4) {
      const [token, fieldList, reviewerId, ...reasonParts] = rest;
      const count = await approveProfileFields(pool, memberId, token, fieldList.split(","), reviewerId, reasonParts.join(" "));
      process.stdout.write(`Approved ${count} reviewed observation(s). Website publication is separate.\n`);
    } else {
      throw new Error("Usage: npm run profile:review -- report <member-id> | link <member-id> <person-key> <report-token> <reviewer-id> <reason> | approve <member-id> <report-token> <comma-separated-fields> <reviewer-id> <reason>");
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
