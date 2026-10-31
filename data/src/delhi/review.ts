import { isDeepStrictEqual } from "node:util";
import type { Observation } from "../contracts.js";

export interface DelhiReviewCase {
  kind: "changed-holder" | "changed-record" | "possible-namesake";
  observationIds: string[];
  reason: string;
}

function nameOf(observation: Observation): string | undefined {
  const value = observation.normalizedValue;
  return value && typeof value === "object" && !Array.isArray(value) && typeof value.name === "string" ? value.name : undefined;
}

export function buildDelhiReviewCases(observations: readonly Observation[]): DelhiReviewCase[] {
  const cases: DelhiReviewCase[] = [];
  const byLocator = new Map<string, Observation[]>();
  const byName = new Map<string, Observation[]>();
  for (const observation of observations) {
    const key = `${observation.predicate}:${observation.locator}`;
    byLocator.set(key, [...(byLocator.get(key) ?? []), observation]);
    const name = nameOf(observation)?.trim().toLocaleLowerCase("en-IN");
    if (name) byName.set(name, [...(byName.get(name) ?? []), observation]);
  }
  for (const rows of byLocator.values()) {
    if (rows.length < 2) continue;
    const unique = rows.filter((row, index) => rows.findIndex((other) => isDeepStrictEqual(other.normalizedValue, row.normalizedValue)) === index);
    if (unique.length < 2) continue;
    const names = new Set(unique.map(nameOf));
    cases.push({ kind: names.size > 1 ? "changed-holder" : "changed-record", observationIds: unique.map((row) => row.id), reason: "Same source locator has conflicting captured values; determine effective status from dated evidence." });
  }
  for (const rows of byName.values()) {
    const distinctLocators = new Set(rows.map((row) => row.locator));
    if (distinctLocators.size < 2) continue;
    cases.push({ kind: "possible-namesake", observationIds: rows.map((row) => row.id), reason: "A shared name is not evidence that these offices have the same holder." });
  }
  return cases;
}
