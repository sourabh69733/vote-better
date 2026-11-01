import { rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type pg from "pg";

import { registry, type SourceDefinition } from "./registry.js";
import { lastRuns, type RunHistory } from "./sync.js";

const target = fileURLToPath(new URL("../../web/records/generated/sync-status.json", import.meta.url));

export interface SourceStatus {
  id: string;
  title: string;
  owner: string;
  url: string;
  refreshDays: number | null;
  // Day of the last run that succeeded or partly succeeded.
  lastChecked: string | null;
  // The latest run failed and the runner is retrying; run details stay in the database.
  failing: boolean;
}

// What the website shows about each source: dates only, so the file changes when a source is
// checked, not on every export. Failure details stay in the run log.
export function buildSyncStatus(sources: readonly SourceDefinition[], runs: Map<string, RunHistory>): { sources: SourceStatus[] } {
  return {
    sources: sources.map((source) => {
      const run = runs.get(source.id);
      return {
        id: source.id, title: source.title, owner: source.owner, url: source.url, refreshDays: source.refreshDays,
        lastChecked: run?.lastCompleted?.slice(0, 10) ?? null,
        failing: run?.last?.outcome === "failed",
      };
    }),
  };
}

export async function exportSyncStatus(pool: pg.Pool): Promise<string> {
  const status = buildSyncStatus(registry, await lastRuns(pool));
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(status, null, 2)}\n`, { flag: "w" });
  await rename(temporary, target);
  const checked = status.sources.filter((source) => source.lastChecked).length;
  return `Sync status written: ${checked} of ${status.sources.length} sources checked, ${status.sources.filter((source) => source.failing).length} failing.`;
}
