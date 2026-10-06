import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface ResearchArea {
  id: string;
  label: string;
  state: string;
}

export type ResearchPinLookup =
  | { status: "invalid" | "unavailable" | "not-covered" | "no-match" }
  | { status: "possible"; areas: ResearchArea[]; reviewStatus: "unreviewed"; generatedAt: string };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export async function lookupResearchPin(
  pin: string,
  path = resolve(process.cwd(), "../data/raw/maps/pin_candidates_draft.json"),
): Promise<ResearchPinLookup> {
  if (!/^[0-9]{6}$/.test(pin)) return { status: "invalid" };
  let document: Record<string, unknown> | null;
  try {
    document = record(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return { status: "unavailable" };
  }
  if (!document || document.reviewStatus !== "unreviewed" || typeof document.generatedAt !== "string") {
    return { status: "unavailable" };
  }
  const pins = record(document.pins);
  const areas = record(document.areas);
  if (!pins || !areas) return { status: "unavailable" };
  const match = record(pins[pin]);
  if (!match) return { status: "not-covered" };
  if (match.status === "no-match") return { status: "no-match" };
  if (!Array.isArray(match.possibleAreaIds) || match.possibleAreaIds.length === 0) return { status: "unavailable" };
  const possible: ResearchArea[] = [];
  for (const id of match.possibleAreaIds) {
    if (typeof id !== "string") return { status: "unavailable" };
    const detail = record(areas[id]);
    if (!detail || typeof detail.label !== "string" || typeof detail.state !== "string") return { status: "unavailable" };
    possible.push({ id, label: detail.label, state: detail.state });
  }
  return { status: "possible", areas: possible, reviewStatus: "unreviewed", generatedAt: document.generatedAt };
}
