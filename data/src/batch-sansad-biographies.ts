import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { LocalBlobStore } from "./blob-store.js";
import { importSansadBiography, type BiographyImportResult } from "./import-sansad-biography.js";
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

function commandArgs(args: readonly string[]): { limit: number; after?: number } {
  let limit: number | undefined;
  let after: number | undefined;
  for (let i = 0; i < args.length; i += 2) {
    const option = args[i];
    const value = args[i + 1];
    if (!value || !/^\d+$/.test(value)) throw new Error("expected a numeric option value");
    if (option === "--limit" && limit === undefined) limit = Number(value);
    else if (option === "--after" && after === undefined) after = Number(value);
    else throw new Error(`unexpected option ${option}`);
  }
  if (limit === undefined || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("--limit must be between 1 and 50");
  }
  return { limit, after };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = commandArgs(process.argv.slice(2));
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    const ids = await rosterIds(pool);
    const store = new CivicStore(pool);
    const blobStore = new LocalBlobStore(fileURLToPath(new URL("../raw/sansad-biography", import.meta.url)));
    const result = await runBiographyBatch(ids, { ...args,
      collect: (memberId) => importSansadBiography(store, memberId, { blobStore }) });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.failed) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
