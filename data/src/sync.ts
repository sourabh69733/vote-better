import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { migrate } from "./migrate.js";
import { registry, validateRegistry, type RunResult, type SourceDefinition } from "./registry.js";
import { CivicStore } from "./store.js";

export interface LastRun { registryId: string; finishedAt: string; outcome: RunResult["outcome"] }

// What the run log says about one source. A run "completed" when it succeeded or was partial;
// consecutiveFailures counts failed runs since the last completed one.
export interface RunHistory { last?: LastRun; lastCompleted?: string; consecutiveFailures: number }

// What the runner reports for one source. "skipped" means nothing ran and nothing was logged.
export type RunOutcome = (RunResult & { timedOut?: boolean }) | { outcome: "skipped"; detail: string };

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
export const DEFAULT_TIMEOUT_MINUTES = 90;
export const MAX_BACKOFF_MS = 7 * DAY_MS;

export async function lastRuns(pool: pg.Pool): Promise<Map<string, RunHistory>> {
  const result = await pool.query(`
    WITH completed AS (
      SELECT registry_id, max(finished_at) AS at FROM sync_run WHERE outcome <> 'failed' GROUP BY registry_id
    )
    SELECT DISTINCT ON (run.registry_id) run.registry_id, run.finished_at, run.outcome, completed.at AS last_completed,
      (SELECT count(*) FROM sync_run failed
        WHERE failed.registry_id = run.registry_id AND failed.outcome = 'failed'
          AND failed.finished_at > coalesce(completed.at, '-infinity'::timestamptz)) AS consecutive_failures
    FROM sync_run run LEFT JOIN completed USING (registry_id)
    ORDER BY run.registry_id, run.finished_at DESC
  `);
  return new Map(result.rows.map((row) => [row.registry_id, {
    last: { registryId: row.registry_id, finishedAt: (row.finished_at as Date).toISOString(), outcome: row.outcome },
    ...(row.last_completed ? { lastCompleted: (row.last_completed as Date).toISOString() } : {}),
    consecutiveFailures: Number(row.consecutive_failures),
  }]));
}

// After n failures in a row, wait 1h, 2h, 4h, ... (at most a week) before trying again.
export function backoffMs(consecutiveFailures: number): number {
  if (consecutiveFailures < 1) return 0;
  return Math.min(2 ** (consecutiveFailures - 1) * HOUR_MS, MAX_BACKOFF_MS);
}

// A source is due when it has never completed, or when its refresh interval has passed since
// the last completed run. Fixed archives (no interval) are due only until they first complete.
// A source whose recent runs failed waits out its backoff before it is due again.
export function isDue(source: Pick<SourceDefinition, "refreshDays">, history: RunHistory | undefined, now = new Date()): boolean {
  if (history?.last?.outcome === "failed" && now.getTime() - Date.parse(history.last.finishedAt) < backoffMs(history.consecutiveFailures)) return false;
  if (!history?.lastCompleted) return true;
  if (source.refreshDays === null) return false;
  return now.getTime() - Date.parse(history.lastCompleted) >= source.refreshDays * DAY_MS;
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

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Runs one source under a per-source lock and a deadline, then logs the run.
// The lock is held on a dedicated connection until the source's own promise settles, so an
// overlapping sync skips the source instead of running it twice. A run that passes its deadline
// is logged as failed and the runner moves on; its work may still be finishing in the background.
export async function runSource(
  pool: pg.Pool, source: SourceDefinition, log: (message: string) => void = () => {}, options: { timeoutMs?: number } = {},
): Promise<RunOutcome> {
  const timeoutMs = options.timeoutMs ?? (source.timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES) * 60_000;
  const lock = await pool.connect();
  let locked = false;
  try {
    locked = (await lock.query("SELECT pg_try_advisory_lock(hashtext($1)) AS locked", [`sync:${source.id}`])).rows[0].locked === true;
  } catch (error) {
    lock.release();
    return { outcome: "skipped", detail: `could not take the run lock: ${message(error)}` };
  }
  if (!locked) {
    lock.release();
    return { outcome: "skipped", detail: "another sync is running this source" };
  }

  const startedAt = new Date();
  const run = source.run({ pool, store: new CivicStore(pool), log })
    .then((result): RunResult & { timedOut?: boolean } => result, (error): RunResult => ({ outcome: "failed", items: 0, detail: message(error) }));
  void run.finally(() => lock.query("SELECT pg_advisory_unlock(hashtext($1))", [`sync:${source.id}`]).catch(() => {}).finally(() => lock.release()));

  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<RunResult & { timedOut: true }>((done) => {
    timer = setTimeout(() => done({
      outcome: "failed", items: 0, timedOut: true,
      detail: `timed out after ${Math.round(timeoutMs / 60_000)} minutes; the run may still be finishing in the background`,
    }), timeoutMs);
  });
  const result = await Promise.race([run, deadline]).finally(() => clearTimeout(timer));

  try {
    await pool.query(
      `INSERT INTO sync_run (registry_id, started_at, finished_at, outcome, items, detail) VALUES ($1, $2, $3, $4, $5, $6)`,
      [source.id, startedAt.toISOString(), new Date().toISOString(), result.outcome, result.items, result.detail.slice(0, 2000)],
    );
  } catch (error) {
    log(`could not write the run log: ${message(error)}`);
    return { ...result, detail: `${result.detail} (run log not written: ${message(error)})` };
  }
  return result;
}

function table(rows: string[][]): string {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) => row.map((cell, column) => cell.padEnd(widths[column])).join("  ")).join("\n");
}

async function main(args: string[]): Promise<void> {
  validateRegistry();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  let timedOut = false;
  try {
    await migrate(pool);
    const runs = await lastRuns(pool);
    const dryRun = args.includes("--dry-run");
    const names = args.filter((arg) => !arg.startsWith("--"));

    if (args.includes("--list") || (!names.length && !args.includes("--due"))) {
      process.stdout.write(`${table([
        ["SOURCE", "EVERY", "REUSE", "REVIEW", "LAST RUN", "LAST OK", "FAILS", "DUE"],
        ...registry.map((source) => {
          const run = runs.get(source.id);
          return [source.id, source.refreshDays === null ? "archive" : `${source.refreshDays}d`, source.reuse.status, source.review,
            run?.last ? `${run.last.finishedAt.slice(0, 16)} ${run.last.outcome}` : "never", run?.lastCompleted?.slice(0, 10) ?? "-",
            String(run?.consecutiveFailures ?? 0), isDue(source, run) ? "yes" : "no"];
        }),
      ])}\n\nRun: npm run sync -- --due   or   npm run sync -- <source-id> ...\n`);
      return;
    }

    const unknown = names.filter((name) => !registry.some((source) => source.id === name));
    if (unknown.length) throw new Error(`unknown source: ${unknown.join(", ")}`);
    const selected = names.length
      ? registry.filter((source) => names.includes(source.id))
      : registry.filter((source) => isDue(source, runs.get(source.id)));
    const ordered = inDependencyOrder(selected, registry);
    if (!ordered.length) { process.stdout.write("Nothing is due.\n"); return; }

    let failures = 0;
    for (const source of ordered) {
      if (dryRun) { process.stdout.write(`would run ${source.id}\n`); continue; }
      process.stdout.write(`▶ ${source.id} …\n`);
      try {
        const result = await runSource(pool, source, (line) => process.stdout.write(`  ${line}\n`));
        process.stdout.write(`  ${result.outcome}: ${result.detail}\n`);
        if (result.outcome !== "succeeded") failures++;
        if ("timedOut" in result && result.timedOut) timedOut = true;
      } catch (error) {
        failures++;
        process.stdout.write(`  failed: ${message(error)}\n`);
      }
    }
    if (failures) process.exitCode = 1;
  } finally {
    // A timed-out run still holds a connection; do not wait on it forever.
    await Promise.race([pool.end(), new Promise((done) => setTimeout(done, timedOut ? 5_000 : 60_000))]);
    if (timedOut) process.exit(process.exitCode ?? 1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
