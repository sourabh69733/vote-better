import pg from "pg";

import { testDatabaseUrl } from "./db.js";

// Fail once with a fix, instead of every database test failing with ECONNREFUSED.
const url = new URL(testDatabaseUrl());
url.pathname = "/postgres";
const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 3000 });
try {
  await client.connect();
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Test database is not reachable at ${url.host} (${reason}).\nStart it from the repo root with:\n  docker compose -f data/compose.yaml up -d --wait`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
