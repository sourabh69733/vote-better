import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { migrate } from "./migrate.js";
import { registry, validateRegistry, type RunResult, type SourceDefinition } from "./registry.js";
import { CivicStore } from "./store.js";

export interface LastRun { registryId: string; finishedAt: string; outcome: RunResult["outcome"] }

const DAY_MS = 86_400_000;

export async function lastRuns(pool: pg.Pool): Promise<Map<string, { lastSuccess?: string; last?: LastRun }>> {
  const result = await pool.query(`
    SELECT DISTINCT ON (registry_id) registry_id, finished_at, outcome,
      (SELECT max(finished_at) FROM sync_run ok WHERE ok.registry_id = sync_run.registry_id AND ok.outcome = 'succeeded') AS last_success
    FROM sync_run ORDER BY registry_id, finished_at DESC
  `);
  return new Map(result.rows.map((row) => [row.registry_id, {
    last: { registryId: row.registry_id, finishedAt: (row.finished_at as Date).toISOString(), outcome: row.outcome },
    ...(row.last_success ? { lastSuccess: (row.last_success as Date).toISOString() } : {}),
  }]));
}

// A source is due when it has never succeeded, or when its refresh interval has passed.
// Fixed archives (no interval) are due only until they first succeed.
export function isDue(source: Pick<SourceDefinition, "refreshDays">, lastSuccess: string | undefined, now = new Date()): boolean {
  if (!lastSuccess) return true;
  if (source.refreshDays === null) return false;
  return now.getTime() - Date.parse(lastSuccess) >= source.refreshDays * DAY_MS;
}

// Sources come before anything that depends on them.
export function inDependencyOrder<T extends Pick<SourceDefinition, "id" | "dependsOn">>(sources: readonly T[], all: readonly T[] = sources): T[] {
  const byId = new Map(all.map((source) => [source.id, source]));
  const wanted = new Set(sources.map((source) => source.id));
  const ordered: T[] = [];
  const visiting = new Set<string>();
  const visit = (source: T) => {
    if (ordered.includes(source)) return;
    if (visiting.has(source.id)) throw new Error(`dependency cycle at ${source.id}`);
    visiting.add(source.id);
    for (const id of source.dependsOn ?? []) if (wanted.has(id)) visit(byId.get(id)!);
    visiting.delete(source.id);
    ordered.push(source);
  };
  for (const source of sources) visit(source);
  return ordered;
}

export async function runSource(pool: pg.Pool, source: SourceDefinition, log: (message: string) => void = () => {}): Promise<RunResult> {
  const startedAt = new Date();
  let result: RunResult;
  try {
    result = await source.run({ pool, store: new CivicStore(pool), log });
  } catch (error) {
    result = { outcome: "failed", items: 0, detail: error instanceof Error ? error.message : String(error) };
  }
  await pool.query(
    `INSERT INTO sync_run (registry_id, started_at, finished_at, outcome, items, detail) VALUES ($1, $2, $3, $4, $5, $6)`,
    [source.id, startedAt.toISOString(), new Date().toISOString(), result.outcome, result.items, result.detail.slice(0, 2000)],
  );
  return result;
}

function table(rows: string[][]): string {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) => row.map((cell, column) => cell.padEnd(widths[column])).join("  ")).join("\n");
}

async function main(args: string[]): Promise<void> {
  validateRegistry();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const runs = await lastRuns(pool);
    const dryRun = args.includes("--dry-run");
    const names = args.filter((arg) => !arg.startsWith("--"));

    if (args.includes("--list") || (!names.length && !args.includes("--due"))) {
      process.stdout.write(`${table([
        ["SOURCE", "EVERY", "REUSE", "REVIEW", "LAST RUN", "LAST OK", "DUE"],
        ...registry.map((source) => {
          const run = runs.get(source.id);
          return [source.id, source.refreshDays === null ? "archive" : `${source.refreshDays}d`, source.reuse.status, source.review,
            run?.last ? `${run.last.finishedAt.slice(0, 16)} ${run.last.outcome}` : "never", run?.lastSuccess?.slice(0, 10) ?? "-",
            isDue(source, run?.lastSuccess) ? "yes" : "no"];
        }),
      ])}\n\nRun: npm run sync -- --due   or   npm run sync -- <source-id> ...\n`);
      return;
    }

    const unknown = names.filter((name) => !registry.some((source) => source.id === name));
    if (unknown.length) throw new Error(`unknown source: ${unknown.join(", ")}`);
    const selected = names.length
      ? registry.filter((source) => names.includes(source.id))
      : registry.filter((source) => isDue(source, runs.get(source.id)?.lastSuccess));
    const ordered = inDependencyOrder(selected, registry);
    if (!ordered.length) { process.stdout.write("Nothing is due.\n"); return; }

    let failures = 0;
    for (const source of ordered) {
      if (dryRun) { process.stdout.write(`would run ${source.id}\n`); continue; }
      process.stdout.write(`▶ ${source.id} …\n`);
      const result = await runSource(pool, source, (message) => process.stdout.write(`  ${message}\n`));
      process.stdout.write(`  ${result.outcome}: ${result.detail}\n`);
      if (result.outcome !== "succeeded") failures++;
    }
    if (failures) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
