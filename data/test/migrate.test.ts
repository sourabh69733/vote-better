import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";

import { migrate } from "../src/migrate.js";

test("migrations replay without changing their recorded version", async () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better",
  });
  try {
    await migrate(pool);
    await migrate(pool);
    const result = await pool.query("SELECT count(*)::integer AS count FROM schema_migration WHERE version = '001_core.sql'");
    assert.equal(result.rows[0].count, 1);
  } finally {
    await pool.end();
  }
});
