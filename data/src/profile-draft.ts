import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { loadProfileReview } from "./profile-review.js";

type Queryable = Pick<pg.Pool, "query">;

export interface DraftProfile {
  schemaVersion: 1;
  access: "local-unverified-profile";
  memberId: number;
  personName: string;
  generatedAt: string;
  sourceCheck?: { method: "sansad-snapshot-replay-v1"; checkedAt: string };
  facts: {
    predicate: string;
    value: unknown;
    source: { url: string; contentHash: string; capturedAt: string; locator: string };
  }[];
}

export async function buildDraftBatch(ids: readonly number[], load: (memberId: number) => Promise<DraftProfile>): Promise<{
  drafts: DraftProfile[];
  exceptions: { memberId: number; reason: string }[];
}> {
  const drafts: DraftProfile[] = [];
  const exceptions: { memberId: number; reason: string }[] = [];
  for (const memberId of ids) {
    try {
      drafts.push(await load(memberId));
    } catch (error) {
      exceptions.push({ memberId, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { drafts, exceptions };
}

export async function listCollectedBiographyIds(db: Queryable): Promise<number[]> {
  const result = await db.query(`
    SELECT DISTINCT o.normalized_value #>> '{}' AS member_id
    FROM observation o JOIN snapshot s ON s.id = o.snapshot_id
    JOIN source src ON src.id = s.source_id
    WHERE o.predicate = 'person.sansadMemberId'
      AND o.normalizer_version IN ('sansad-ls-biography-v1', 'sansad-ls-biography-v2')
      AND src.authority = 'Parliament of India'
      AND s.url LIKE 'https://sansad.in/api_ls/member/%?locale=en'
  `);
  const ids = result.rows.map((row) => Number(row.member_id));
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error("invalid collected member ID");
  return ids.sort((a, b) => a - b);
}

export async function loadDraftProfile(db: Queryable, memberId: number,
  sourceCheck?: { memberId: number; token?: string; status: string; checkedAt?: string }): Promise<DraftProfile> {
  const report = await loadProfileReview(db, memberId);
  const decisions = await db.query(`
    SELECT o.id, latest.decision FROM observation o
    LEFT JOIN LATERAL (
      SELECT rev.decision FROM review_observation ro
      JOIN review_event rev ON rev.id = ro.review_id
      WHERE ro.observation_id = o.id ORDER BY rev.sequence DESC LIMIT 1
    ) latest ON true
    WHERE o.id = ANY($1::uuid[])
  `, [report.observations.map((observation) => observation.id)]);
  const hidden = new Set(decisions.rows.filter((row) =>
    row.decision === "rejected" || row.decision === "needs-changes").map((row) => row.id as string));
  const facts = report.observations.filter((observation) => !hidden.has(observation.id)).map((observation) => {
    const snapshot = report.sources.find((source) => source.snapshotId === observation.snapshotId);
    if (!snapshot) throw new Error("observation has no source snapshot");
    return { predicate: observation.predicate, value: observation.value,
      source: { url: snapshot.url, contentHash: snapshot.contentHash,
        capturedAt: snapshot.capturedAt, locator: observation.locator } };
  });
  return { schemaVersion: 1, access: "local-unverified-profile", memberId,
    personName: report.name, generatedAt: new Date().toISOString(),
    ...(sourceCheck?.memberId === memberId && sourceCheck.status === "checked" &&
      sourceCheck.token === report.token && sourceCheck.checkedAt
      ? { sourceCheck: { method: "sansad-snapshot-replay-v1" as const, checkedAt: sourceCheck.checkedAt } } : {}),
    facts };
}

async function writeJson(target: string, value: unknown): Promise<void> {
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, target);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    if (process.argv.length !== 2) throw new Error("Usage: npm run profile:drafts");
    const ids = await listCollectedBiographyIds(pool);
    let sourceChecks: { schemaVersion?: number; method?: string;
      entries?: { memberId: number; token?: string; status: string; checkedAt?: string }[] } = {};
    try {
      sourceChecks = JSON.parse(await readFile(fileURLToPath(new URL("../raw/profile-source-checks/index.json", import.meta.url)), "utf8"));
    } catch { /* An absent local check report leaves drafts unverified. */ }
    const checkedEntries = sourceChecks.schemaVersion === 1 && sourceChecks.method === "sansad-snapshot-replay-v1" &&
      Array.isArray(sourceChecks.entries) ? sourceChecks.entries : [];
    const { drafts, exceptions } = await buildDraftBatch(ids, (id) => loadDraftProfile(pool, id,
      checkedEntries.find((entry) => entry.memberId === id)));
    const directory = fileURLToPath(new URL("../raw/profile-drafts/", import.meta.url));
    await mkdir(directory, { recursive: true, mode: 0o700 });
    for (const draft of drafts) await writeJson(resolve(directory, `${draft.memberId}.json`), draft);
    for (const exception of exceptions) await rm(resolve(directory, `${exception.memberId}.json`), { force: true });
    await writeJson(resolve(directory, "index.json"), { schemaVersion: 1,
      access: "local-unverified-profile", generatedAt: new Date().toISOString(),
      memberIds: drafts.map((draft) => draft.memberId), exceptions });
    process.stdout.write(`${JSON.stringify({ exported: drafts.length,
      exceptions, directory })}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
