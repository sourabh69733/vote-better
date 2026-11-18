import pg from "pg";

import { migrate } from "../src/migrate.js";

const defaultUrl = "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better_test";

export function testDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.TEST_DATABASE_URL ?? defaultUrl;
  const url = new URL(value);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new Error("test database needs a PostgreSQL URL");
  if (!/^[a-z][a-z0-9_]*_test$/.test(name)) throw new Error("test database name must end in _test");
  return value;
}

export function createTestPool(): pg.Pool {
  return new pg.Pool({ connectionString: testDatabaseUrl() });
}

export async function ensureTestDatabase(): Promise<void> {
  const url = new URL(testDatabaseUrl());
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = "/postgres";
  const admin = new pg.Pool({ connectionString: url.toString() });
  try {
    const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (!existing.rowCount) {
      try {
        await admin.query(`CREATE DATABASE ${name}`);
      } catch (error) {
        const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
        if (code !== "42P04" && code !== "23505") throw error;
      }
    }
  } finally {
    await admin.end();
  }
}

export async function prepareTestDatabase(pool: pg.Pool): Promise<void> {
  await ensureTestDatabase();
  await migrate(pool);
}
