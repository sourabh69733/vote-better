import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const migrationDir = fileURLToPath(new URL("../migrations/", import.meta.url));

export async function migrate(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(2099941601)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        version text PRIMARY KEY,
        content_hash text NOT NULL,
        recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
      )
    `);
    const files = (await readdir(migrationDir)).filter((name) => /^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
    for (const file of files) {
      const sql = await readFile(join(migrationDir, file), "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");
      const current = await client.query<{ content_hash: string }>("SELECT content_hash FROM schema_migration WHERE version = $1", [file]);
      if (current.rows.length) {
        if (current.rows[0].content_hash !== hash) throw new Error(`migration changed after application: ${file}`);
        continue;
      }
      await client.query(sql);
      await client.query("INSERT INTO schema_migration (version, content_hash) VALUES ($1, $2)", [file, hash]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better",
  });
  try {
    await migrate(pool);
    process.stdout.write("Database migrations applied.\n");
  } finally {
    await pool.end();
  }
}
