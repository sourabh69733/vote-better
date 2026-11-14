import status from "@/records/generated/sync-status.json";

// When each source behind the site was last checked, written by `npm --prefix data run export:all`.

export interface SourceStatus {
  id: string;
  title: string;
  owner: string;
  url: string;
  refreshDays: number | null;
  lastChecked: string | null;
  failing: boolean;
}

export type Freshness = "current" | "overdue" | "retrying" | "not-checked";

const DAY_MS = 86_400_000;

// Overdue once twice the refresh interval has passed, which allows for a missed weekly run.
export function freshnessOf(source: Pick<SourceStatus, "refreshDays" | "lastChecked" | "failing">, today: string): Freshness {
  if (source.failing) return "retrying";
  if (!source.lastChecked) return "not-checked";
  if (source.refreshDays === null) return "current";
  return Date.parse(today) - Date.parse(source.lastChecked) > 2 * source.refreshDays * DAY_MS ? "overdue" : "current";
}

export const sourceStatuses = (status as { sources: SourceStatus[] }).sources;
