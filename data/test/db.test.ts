import assert from "node:assert/strict";
import test from "node:test";

import { testDatabaseUrl } from "./db.js";

test("test database ignores the application DATABASE_URL", () => {
  const url = testDatabaseUrl({ DATABASE_URL: "postgres://example:secret@host/production" });
  assert.equal(new URL(url).pathname, "/vote_better_test");
});

test("test database rejects a non-test database name", () => {
  assert.throws(() => testDatabaseUrl({ TEST_DATABASE_URL: "postgres://example:secret@host/vote_better" }), /_test/);
});
