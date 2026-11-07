import * as XLSX from "xlsx";

import { isUtcInstant, type JsonValue } from "../contracts.js";
import type { ObservationDraft } from "../store.js";
import { slugify } from "./eci-ge2024-detailed-result.js";

// ECI "Constituency wise detailed result" for 2019 and 2014. These older reports
// have no valid-vote or vote-share columns, so those values are calculated here
// and listed in `derived` on every row.

export type HistoryYear = 2019 | 2014;

export const ECI_HISTORY_NORMALIZER_VERSION = "eci-ls-history-report33-v1";

const HEADER = [
  "state name", "pc name", "candidates name", "sex", "age", "category", "party name", "party symbol",
  "general", "postal", "total", "over total electors in constituency", "over total votes polled in constituency", "total electors",
];

// Seats ECI's own file leaves out. They are listed so their absence is a known gap, not a silent one.
export const KNOWN_MISSING: Record<HistoryYear, { seats: number; states: string[] }> = {
  2019: { seats: 0, states: [] },
  2014: { seats: 32, states: ["Chhattisgarh", "Odisha"] },
};

type Cell = string | number | null;

export interface HistoryCandidateResult {
  [key: string]: JsonValue;
  election: string;
  personKey: string;
  state: string;
  constituency: string;
  name: string;
  gender: "female" | "male" | "third" | null;
  age: number | null;
  category: string | null;
  party: string;
  partySymbol: string | null;
  votes: { general: number; postal: number; total: number };
  shareOfValidVotes: number;
  rank: number;
  contest: { electors: number; votesPolled: number; validVotes: number; notaVotes: number; candidates: number };
  derived: string[];
}

export interface ParsedHistory {
  year: HistoryYear;
  seats: number;
  candidates: { excelRow: number; personKey: string; raw: Cell[]; value: HistoryCandidateResult }[];
  notes: { state: string; constituency: string; difference: number }[];
}

const GENDER: Record<string, HistoryCandidateResult["gender"]> = { MALE: "male", M: "male", FEMALE: "female", F: "female", THIRD: "third", TG: "third", O: "third" };

const clean = (value: Cell) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value);

function count(value: Cell, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative integer`);
  return value;
}

function text(value: Cell, label: string): string {
  const trimmed = clean(value);
  if (typeof trimmed !== "string" || !trimmed) throw new Error(`${label} is required`);
  return trimmed;
}

export function parseEciHistoryDetailedResult(bytes: Buffer, year: HistoryYear): ParsedHistory {
  const book = XLSX.read(bytes, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[book.SheetNames[0]], { header: 1, defval: null, raw: true });
  const titleRow = rows.findIndex((row) => row.some((cell) => typeof cell === "string" && /constituency wise detailed result/i.test(cell)));
  if (titleRow < 0 || titleRow > 2) throw new Error("not an ECI constituency wise detailed result");
  const headerRow = rows.findIndex((row) => String(clean(row[0]) ?? "").toLowerCase() === "state name");
  if (headerRow < 0 || HEADER.some((label, index) => String(clean(rows[headerRow][index]) ?? "").toLowerCase() !== label)) {
    throw new Error("report header changed");
  }

  const seats = new Map<string, { excelRow: number; raw: Cell[] }[]>();
  rows.forEach((row, index) => {
    if (index <= headerRow || typeof row[10] !== "number" || typeof row[0] !== "string") return;
    const key = `${text(row[0], `row ${index + 1} state`)}\u0000${text(row[1], `row ${index + 1} constituency`)}`;
    const list = seats.get(key) ?? [];
    list.push({ excelRow: index + 1, raw: row.slice(0, HEADER.length) });
    seats.set(key, list);
  });
  const expected = 543 - KNOWN_MISSING[year].seats;
  if (seats.size !== expected) throw new Error(`expected ${expected} seats for ${year}, found ${seats.size}`);
  for (const state of KNOWN_MISSING[year].states) {
    if ([...seats.keys()].some((key) => key.startsWith(`${state}\u0000`))) throw new Error(`${state} is no longer missing from the ${year} file; update KNOWN_MISSING`);
  }

  const candidates: ParsedHistory["candidates"] = [];
  const notes: ParsedHistory["notes"] = [];
  for (const [key, seatRows] of seats) {
    const [state, constituency] = key.split("\u0000");
    const electors = count(seatRows[0].raw[13], `${constituency} electors`);
    for (const { raw, excelRow } of seatRows) {
      if (raw[13] !== electors) throw new Error(`row ${excelRow} electors differ within the seat`);
      if (count(raw[8], `row ${excelRow} general`) + count(raw[9], `row ${excelRow} postal`) !== count(raw[10], `row ${excelRow} total`)) {
        throw new Error(`row ${excelRow} general and postal votes do not add up`);
      }
    }
    // Each row's share of votes polled implies the seat's total votes polled. All rows must agree.
    const implied = seatRows.filter(({ raw }) => typeof raw[12] === "number" && (raw[12] as number) > 0 && (raw[10] as number) > 0)
      .map(({ raw }) => (raw[10] as number) / ((raw[12] as number) / 100));
    if (!implied.length) throw new Error(`${constituency} has no vote share to check`);
    const votesPolled = Math.round(implied.reduce((sum, value) => sum + value, 0) / implied.length);
    if (implied.some((value) => Math.abs(value - votesPolled) / votesPolled > 0.001)) throw new Error(`${constituency} vote shares disagree with each other`);

    const nota = seatRows.filter(({ raw }) => clean(raw[6]) === "NOTA");
    if (nota.length !== 1) throw new Error(`${constituency} needs exactly one NOTA row`);
    const people = seatRows.filter(({ raw }) => clean(raw[6]) !== "NOTA");
    const validVotes = people.reduce((sum, { raw }) => sum + (raw[10] as number), 0);
    // ECI's share column sometimes uses a slightly different total than the vote rows add up to.
    // Keep the vote counts, use the larger total, and record the difference on the seat.
    const counted = validVotes + (nota[0].raw[10] as number);
    if (counted > votesPolled) notes.push({ state, constituency, difference: counted - votesPolled });
    const sorted = [...people].sort((a, b) => (b.raw[10] as number) - (a.raw[10] as number));
    if (sorted.length > 1 && sorted[0].raw[10] === sorted[1].raw[10]) throw new Error(`${constituency} has a tie for first place`);
    const contest = { electors, votesPolled: Math.max(votesPolled, counted), validVotes, notaVotes: nota[0].raw[10] as number, candidates: people.length };

    const names = new Map<string, number>();
    for (const { raw } of people) names.set(slugify(text(raw[2], "name")), (names.get(slugify(text(raw[2], "name"))) ?? 0) + 1);
    const keys = new Set<string>();
    for (const { raw, excelRow } of people) {
      const name = text(raw[2], `row ${excelRow} name`);
      const party = text(raw[6], `row ${excelRow} party`);
      const sex = clean(raw[3]);
      const gender = typeof sex === "string" ? GENDER[sex.toUpperCase()] : null;
      if (typeof sex === "string" && gender === undefined) throw new Error(`row ${excelRow} unknown sex ${sex}`);
      let personKey = `lok-sabha-${year}/${slugify(state)}/${slugify(constituency)}/${slugify(name)}`;
      if ((names.get(slugify(name)) ?? 0) > 1) personKey += `-${slugify(party)}`;
      if (keys.has(personKey)) personKey += `-row-${excelRow}`;
      keys.add(personKey);
      const total = raw[10] as number;
      candidates.push({
        excelRow, personKey, raw,
        value: {
          election: `lok-sabha-${year}`, personKey, state, constituency, name, gender: gender ?? null,
          age: typeof raw[4] === "number" ? raw[4] : null, category: typeof clean(raw[5]) === "string" ? clean(raw[5]) as string : null,
          party, partySymbol: typeof clean(raw[7]) === "string" ? clean(raw[7]) as string : null,
          votes: { general: raw[8] as number, postal: raw[9] as number, total },
          shareOfValidVotes: Math.round((total / validVotes) * 10000) / 100,
          rank: sorted.findIndex((item) => item.excelRow === excelRow) + 1,
          contest,
          derived: ["shareOfValidVotes", "contest.validVotes", "contest.votesPolled"],
        },
      });
    }
  }
  if (notes.length > 25) throw new Error(`${notes.length} seats disagree with their own vote shares; check the file`);
  return { year, seats: seats.size, candidates, notes };
}

export function normalizeEciHistoryDetailedResult(report: ParsedHistory, normalizedAt: string): ObservationDraft[] {
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be a UTC instant");
  return report.candidates.map(({ excelRow, raw, value }) => ({
    locator: `Worksheet, row ${excelRow}`,
    predicate: "candidate.result",
    rawValue: JSON.stringify(raw),
    normalizedValue: value,
    normalizedAt,
    normalizerVersion: ECI_HISTORY_NORMALIZER_VERSION,
  }));
}
