import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { exportElections } from "./export-elections.js";
import { exportJaipur } from "./export-jaipur.js";
import { exportLokSabha2024 } from "./export-lok-sabha-2024.js";
import { exportSyncStatus } from "./export-sync-status.js";
import { migrate } from "./migrate.js";

// Rebuilds every file the website reads from the database, in dependency order.
// Sources that write their own file while they sync (MPLADS works, Sansad archives) are not repeated here.
export async function exportAll(pool: pg.Pool, write = (text: string) => { process.stdout.write(text); }): Promise<void> {
  write(`${await exportJaipur(pool)}\n`);
  write(`${await exportLokSabha2024(pool)}\n`);
  await exportElections(pool, write);
  write(`${await exportSyncStatus(pool)}\n`);
}

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    await exportAll(pool);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
