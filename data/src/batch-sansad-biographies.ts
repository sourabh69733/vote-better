import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { LocalBlobStore } from "./blob-store.js";
import { importSansadBiography, type BiographyImportResult } from "./import-sansad-biography.js";
import { listCollectedBiographyIds } from "./profile-draft.js";
import { CivicStore } from "./store.js";

export interface BatchOptions {
  collect: (memberId: number) => Promise<BiographyImportResult>;
  after?: number;
  limit: number;
  minIntervalMs?: number;
}

export interface BatchResult {
  attempted: number;
  saved: number;
  failed: number;
  drafts: number;
  lastMemberId?: number;
  remaining: number;
  failedMemberIds?: number[];
}

export function missingBiographyIds(rosterIds: readonly number[], collectedIds: readonly number[]): number[] {
  const collected = new Set(collectedIds);
  return [...new Set(rosterIds)].filter((id) => !collected.has(id)).sort((a, b) => a - b);
}

export async function runBiographyBatch(memberIds: readonly number[], options: BatchOptions): Promise<BatchResult> {
  if (memberIds.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error("invalid member IDs");
  if (!Number.isSafeInteger(options.limit) || options.limit < 1) throw new Error("limit must be positive");
  if (options.after !== undefined && (!Number.isSafeInteger(options.after) || options.after < 0)) throw new Error("invalid after ID");
  const minIntervalMs = options.minIntervalMs ?? 2_000;
  if (minIntervalMs < 0) throw new Error("invalid interval");
  const pending = [...new Set(memberIds)].sort((a, b) => a - b).filter((id) => id > (options.after ?? 0));
  const selected = pending.slice(0, options.limit);
  const failures: number[] = [];
  let saved = 0;
  let drafts = 0;
  for (const [index, memberId] of selected.entries()) {
    if (index && minIntervalMs) await new Promise<void>((done) => setTimeout(done, minIntervalMs));
    const result = await options.collect(memberId);
    if (result.memberId !== memberId) throw new Error("collector returned a different member ID");
    if (result.status === "drafts-saved") {
      saved += 1;
      drafts += result.drafts;
    } else {
      failures.push(memberId);
    }
  }
  return { attempted: selected.length, saved, failed: failures.length, drafts,
    lastMemberId: selected.at(-1), remaining: pending.length - selected.length,
    ...(failures.length ? { failedMemberIds: failures } : {}) };
}

export async function runAllBiographyBatches(memberIds: readonly number[], options: BatchOptions & {
  betweenBatchMs?: number;
  onBatch?: (batch: BatchResult) => void;
}): Promise<BatchResult & { batches: number }> {
  const betweenBatchMs = options.betweenBatchMs ?? 2_000;
  if (!Number.isSafeInteger(betweenBatchMs) || betweenBatchMs < 0) throw new Error("invalid between-batch interval");
  let after = options.after;
  let batches = 0;
  let attempted = 0;
  let saved = 0;
  let failed = 0;
  let drafts = 0;
  const failedMemberIds: number[] = [];
  while (true) {
    const batch = await runBiographyBatch(memberIds, { ...options, after });
    if (!batch.attempted) break;
    batches++;
    attempted += batch.attempted;
    saved += batch.saved;
    failed += batch.failed;
    drafts += batch.drafts;
    failedMemberIds.push(...(batch.failedMemberIds ?? []));
    after = batch.lastMemberId;
    options.onBatch?.(batch);
    if (!batch.remaining) break;
    if (betweenBatchMs) await new Promise<void>((done) => setTimeout(done, betweenBatchMs));
  }
  return { attempted, saved, failed, drafts, remaining: 0,
    ...(after !== undefined ? { lastMemberId: after } : {}),
    ...(failedMemberIds.length ? { failedMemberIds } : {}), batches };
}

async function rosterIds(pool: pg.Pool): Promise<number[]> {
  const result = await pool.query(`
    SELECT DISTINCT o.raw_value AS member_id
    FROM observation o
    JOIN snapshot s ON s.id = o.snapshot_id
    JOIN source src ON src.id = s.source_id
    WHERE o.normalizer_version = 'sansad-ls-members-v1'
      AND o.predicate = 'person.sansadMemberId'
      AND src.authority = 'Parliament of India'
      AND src.url LIKE 'https://sansad.in/api_ls/member?%'
  `);
  const ids = result.rows.map((row) => Number(row.member_id));
  if (!ids.length || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error("invalid or missing Sansad roster IDs");
  return ids;
}

function commandArgs(args: readonly string[]): { limit: number; after?: number; missingOnly: boolean; allMissing: boolean } {
  let limit: number | undefined;
  let after: number | undefined;
  let missingOnly = false;
  let allMissing = false;
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    if (option === "--missing-only" && !missingOnly) { missingOnly = true; continue; }
    if (option === "--all-missing" && !allMissing) { allMissing = true; continue; }
    const value = args[i + 1];
    if (!value || !/^\d+$/.test(value)) throw new Error("expected a numeric option value");
    if (option === "--limit" && limit === undefined) limit = Number(value);
    else if (option === "--after" && after === undefined) after = Number(value);
    else throw new Error(`unexpected option ${option}`);
    i++;
  }
  if (limit === undefined || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("--limit must be between 1 and 50");
  }
  if (allMissing && !missingOnly) throw new Error("--all-missing requires --missing-only");
  return { limit, after, missingOnly, allMissing };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = commandArgs(process.argv.slice(2));
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    const ids = await rosterIds(pool);
    const pending = args.missingOnly ? missingBiographyIds(ids, await listCollectedBiographyIds(pool)) : ids;
    const store = new CivicStore(pool);
    const blobStore = new LocalBlobStore(fileURLToPath(new URL("../raw/sansad-biography", import.meta.url)));
    const options = { ...args, collect: (memberId: number) => importSansadBiography(store, memberId, { blobStore }) };
    const result = args.allMissing
      ? await runAllBiographyBatches(pending, { ...options,
        onBatch: (batch) => process.stdout.write(`${JSON.stringify({ batch })}\n`) })
      : await runBiographyBatch(pending, options);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.failed) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
