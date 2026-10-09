import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import pg from "pg";
import { LocalBlobStore } from "../blob-store.js";
import { migrate } from "../migrate.js";
import { CivicStore } from "../store.js";
import { collectDelhiSource } from "./collect.js";
import { reconcileDelhiSnapshot } from "./reconcile.js";

export const initialDelhiSources = ["gnctd-services-officers", "delhi-assembly-secretariat", "delhi-police-contacts"] as const;

export async function importInitialDelhiSources(pool: pg.Pool, store: CivicStore, blobs: LocalBlobStore) {
  const results = [];
  for (const sourceId of initialDelhiSources) {
    const collected = await collectDelhiSource(sourceId, store, blobs);
    const mapped = collected.outcome === "succeeded" && collected.snapshotId
      ? await reconcileDelhiSnapshot(pool, sourceId, collected.snapshotId) : 0;
    results.push({ sourceId, ...collected, mapped });
  }
  return results;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const blobs = new LocalBlobStore(fileURLToPath(new URL("../../raw/delhi/", import.meta.url)));
    const result = await importInitialDelhiSources(pool, new CivicStore(pool), blobs);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.some((item) => item.outcome !== "succeeded")) process.exitCode = 1;
  } finally { await pool.end(); }
}
