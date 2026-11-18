import * as XLSX from "xlsx";

import { isUtcInstant, type JsonValue } from "../contracts.js";
import type { ObservationDraft } from "../store.js";

export const ECI_GE2024_DETAILED_RESULT_URL =
  "https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/33-Constituency-Wise-Detailed-Result.xls";
export const ECI_GE2024_DETAILED_RESULT_NORMALIZER_VERSION = "eci-ge2024-report33-v1";

// Surat (PC 24, Gujarat) was decided unopposed and is not in this report.
export const ECI_GE2024_EXPECTED_SEATS = 542;

export const XLS_DOCUMENT = {
  label: "XLS", accept: "application/vnd.ms-excel",
  contentTypes: ["application/vnd.ms-excel", "application/octet-stream"],
  magic: Buffer.from("d0cf11e0a1b11ae1", "hex"),
};

const HEADER = [
  "State Name", "PC Name", "Candidate Name", "Gender", "Age", "Category", "Party Name", "Party Symbol",
  "Total Votes Polled In\nThe Constituency", "Valid Votes", "General", "Postal", "Total",
  "Over Total Electors In Constituency", "Over Total Votes Polled In Constituency",
  "Over Total Valid Votes Polled In Constituency", "Total Electors",
];

type Cell = string | number | null;

export interface CandidateResult {
  [key: string]: JsonValue;
  election: "lok-sabha-2024";
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
}

export interface ParsedReport {
  seats: number;
  candidates: { excelRow: number; personKey: string; raw: Cell[]; value: CandidateResult }[];
}

export function slugify(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function count(value: Cell, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative integer`);
  return value;
}

function text(value: Cell, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function optionalText(value: Cell): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseEciGe2024DetailedResult(bytes: Buffer, expectedSeats = ECI_GE2024_EXPECTED_SEATS): ParsedReport {
  const book = XLSX.read(bytes, { type: "buffer" });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) throw new Error("report has no worksheet");
  const rows = XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, defval: null, raw: true });
  if (rows[0]?.[0] !== "33 - CONSTITUENCY WISE DETAILED RESULT") throw new Error("not ECI report 33");
  if (HEADER.some((label, index) => rows[2]?.[index] !== label)) throw new Error("report header changed");
  if (!rows.some((row) => typeof row[0] === "string" && row[0].startsWith("These statistical reports are prepared only"))) {
    throw new Error("report disclaimer missing");
  }

  type Row = { excelRow: number; raw: Cell[] };
  const seats = new Map<string, Row[]>();
  rows.forEach((row, index) => {
    if (index < 3 || typeof row[12] !== "number") return;
    const label = `row ${index + 1}`;
    const key = `${text(row[0], `${label} state`)}\u0000${text(row[1], `${label} constituency`)}`;
    const list = seats.get(key) ?? [];
    list.push({ excelRow: index + 1, raw: row.slice(0, HEADER.length) });
    seats.set(key, list);
  });
  if (seats.size !== expectedSeats) throw new Error(`expected ${expectedSeats} seats, found ${seats.size}`);

  const candidates: ParsedReport["candidates"] = [];
  for (const [key, seatRows] of seats) {
    const [state, constituency] = key.split("\u0000");
    const first = seatRows[0].raw;
    const contestBase = { electors: count(first[16], `${constituency} electors`), votesPolled: count(first[8], `${constituency} votes polled`), validVotes: count(first[9], `${constituency} valid votes`) };
    for (const { raw, excelRow } of seatRows) {
      if (raw[16] !== first[16] || raw[8] !== first[8] || raw[9] !== first[9]) throw new Error(`row ${excelRow} seat totals differ`);
      if (count(raw[10], `row ${excelRow} general votes`) + count(raw[11], `row ${excelRow} postal votes`) !== count(raw[12], `row ${excelRow} total votes`)) {
        throw new Error(`row ${excelRow} general and postal votes do not add up`);
      }
    }
    const nota = seatRows.filter(({ raw }) => raw[2] === "NOTA");
    if (nota.length !== 1) throw new Error(`${constituency} needs exactly one NOTA row`);
    const people = seatRows.filter(({ raw }) => raw[2] !== "NOTA");
    if (people.reduce((sum, { raw }) => sum + (raw[12] as number), 0) !== contestBase.validVotes) {
      throw new Error(`${constituency} candidate votes do not match valid votes`);
    }
    const sorted = [...people].sort((a, b) => (b.raw[12] as number) - (a.raw[12] as number));
    if (sorted.length > 1 && sorted[0].raw[12] === sorted[1].raw[12]) throw new Error(`${constituency} has a tie for first place`);
    const contest = { ...contestBase, notaVotes: nota[0].raw[12] as number, candidates: people.length };

    const names = new Map<string, number>();
    for (const { raw } of people) names.set(slugify(text(raw[2], "name")), (names.get(slugify(raw[2] as string)) ?? 0) + 1);
    const keys = new Set<string>();
    for (const { raw, excelRow } of people) {
      const name = text(raw[2], `row ${excelRow} name`);
      const party = text(raw[6], `row ${excelRow} party`);
      const gender = optionalText(raw[3])?.toLowerCase();
      if (gender !== undefined && !["female", "male", "third"].includes(gender)) throw new Error(`row ${excelRow} unknown gender`);
      if (raw[4] !== null) count(raw[4], `row ${excelRow} age`);
      if (typeof raw[15] !== "number") throw new Error(`row ${excelRow} vote share is required`);
      let personKey = `lok-sabha-2024/${slugify(state)}/${slugify(constituency)}/${slugify(name)}`;
      if ((names.get(slugify(name)) ?? 0) > 1) personKey += `-${slugify(party)}`;
      if (keys.has(personKey)) personKey += `-row-${excelRow}`;
      keys.add(personKey);
      candidates.push({
        excelRow, personKey, raw,
        value: {
          election: "lok-sabha-2024", personKey, state, constituency, name,
          gender: (gender ?? null) as CandidateResult["gender"],
          age: raw[4] as number | null, category: optionalText(raw[5]), party, partySymbol: optionalText(raw[7]),
          votes: { general: raw[10] as number, postal: raw[11] as number, total: raw[12] as number },
          shareOfValidVotes: raw[15], rank: sorted.findIndex((item) => item.excelRow === excelRow) + 1, contest,
        },
      });
    }
  }
  return { seats: seats.size, candidates };
}

export function normalizeEciGe2024DetailedResult(report: ParsedReport, normalizedAt: string): ObservationDraft[] {
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be a UTC instant");
  return report.candidates.map(({ excelRow, raw, value }) => ({
    locator: `Worksheet, row ${excelRow}`,
    predicate: "candidate.result",
    rawValue: JSON.stringify(raw),
    normalizedValue: value,
    normalizedAt,
    normalizerVersion: ECI_GE2024_DETAILED_RESULT_NORMALIZER_VERSION,
  }));
}
