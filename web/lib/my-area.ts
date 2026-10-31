import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { findSeat, requireResults, type ResultSeat } from "./results";

// PIN code to assembly seat, from postal and assembly boundaries (data/src/geo/build_pin_lookup.py).
// The boundary licence is still being checked, so the file stays in data/raw and is not deployed:
// without it, PIN search is switched off and voters find their seat by name instead.

const DEFAULT_FILE = () => process.env.PIN_LOOKUP_FILE ?? resolve(process.cwd(), "../data/raw/maps/pin_assembly_rajasthan_draft.json");
// LGD state codes in the boundary layer's seat IDs ("08054" is Rajasthan seat 54).
const STATES: Record<string, { name: string; assembly: "rajasthan-assembly-2023" }> = { "08": { name: "Rajasthan", assembly: "rajasthan-assembly-2023" } };

export interface AreaSeat {
  // Share of the PIN's land area inside this assembly seat. Land, not people.
  share: number;
  assembly: ResultSeat;
  parliament?: ResultSeat;
}

export type AreaLookup =
  | { status: "invalid" | "unavailable" }
  | { status: "not-covered"; pin: string }
  | { status: "found"; pin: string; generatedAt: string; seats: AreaSeat[] };

export const pinLookupAvailable = (path = DEFAULT_FILE()) => existsSync(path);

const plain = (value: string) => value.toLowerCase().replace(/\((sc|st)\)/g, "").replace(/[^a-z0-9]/g, "");

let cached: { path: string; document: Record<string, unknown> } | undefined;

export async function lookupMyArea(pin: string, path = DEFAULT_FILE()): Promise<AreaLookup> {
  if (!/^[1-9][0-9]{5}$/.test(pin)) return { status: "invalid" };
  if (cached?.path !== path) {
    try {
      cached = { path, document: JSON.parse(await readFile(path, "utf8")) };
    } catch {
      return { status: "unavailable" };
    }
  }
  const { document } = cached;
  const pins = document.pins as Record<string, { possibleAreaIds?: unknown; areaShares?: Record<string, number> }> | undefined;
  const areas = document.areas as Record<string, { label?: string }> | undefined;
  if (!pins || !areas || typeof document.generatedAt !== "string") return { status: "unavailable" };
  const match = pins[pin];
  if (!match || !Array.isArray(match.possibleAreaIds) || !match.possibleAreaIds.length) return { status: "not-covered", pin };

  const seats: AreaSeat[] = [];
  for (const id of match.possibleAreaIds) {
    if (typeof id !== "string") return { status: "unavailable" };
    const state = STATES[id.slice(0, 2)];
    if (!state) continue;
    const assembly = requireResults(state.assembly).seats.find((seat) => seat.number === Number(id.slice(2)));
    // The boundary layer and ECI must agree on the seat's name; otherwise the match is not shown.
    if (!assembly || plain(areas[id]?.label ?? "") !== plain(assembly.sourceName)) continue;
    const parliament = assembly.parliament ? findSeat("lok-sabha-2024", assembly.stateSlug, assembly.parliament.slug) : undefined;
    seats.push({ share: match.areaShares?.[id] ?? 1 / match.possibleAreaIds.length, assembly, ...(parliament ? { parliament } : {}) });
  }
  if (!seats.length) return { status: "not-covered", pin };
  return { status: "found", pin, generatedAt: document.generatedAt, seats: seats.sort((a, b) => b.share - a.share) };
}
