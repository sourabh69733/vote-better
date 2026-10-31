import assert from "node:assert/strict";
import test from "node:test";

import { migrate } from "../src/migrate.js";
import { createTestPool, ensureTestDatabase } from "./db.js";

test("migrations replay without changing their recorded version", async () => {
  await ensureTestDatabase();
  const pool = createTestPool();
  try {
    await migrate(pool);
    await migrate(pool);
    const result = await pool.query("SELECT count(*)::integer AS count FROM schema_migration WHERE version = '001_core.sql'");
    assert.equal(result.rows[0].count, 1);
  } finally {
    await pool.end();
  }
});
