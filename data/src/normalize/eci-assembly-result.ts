import * as XLSX from "xlsx";

import { isUtcInstant, type JsonValue } from "../contracts.js";
import type { ObservationDraft } from "../store.js";
import { slugify } from "./eci-ge2024-detailed-result.js";

// ECI statistical reports for a state assembly election, as ECI has published them since 2022:
// report 10 (detailed results) is checked against report 2 (successful candidates),
// report 12 (AC-wise voters information) and report 5 (performance of political parties).

export const ECI_ASSEMBLY_NORMALIZER_VERSION = "eci-assembly-report10-v1";

const REPORTS = "https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports";

export interface AssemblyElection {
  id: string;
  state: string;
  seats: number;
  // Where the four reports are: a folder of spreadsheets, or one ECI archive page that lists them all.
  base?: string;
  archive?: string;
  // Anything a reader needs to know about this report, shown with its source.
  note?: string;
}

const OLD_ECI = "https://old.eci.gov.in/files/file";

// "2023_Including" is ECI's final report including Karanpur, whose poll was adjourned to January 2024.
export const ASSEMBLY_ELECTIONS: Record<string, AssemblyElection> = {
  "rajasthan-assembly-2023": {
    id: "rajasthan-assembly-2023", state: "Rajasthan", seats: 200, base: `${REPORTS}/rajasthan/2023_Including`,
    note: "ECI's final report, including Karanpur, whose poll was adjourned to January 2024 after a candidate died.",
  },
  // The states whose assemblies end in 2027, from ECI's archive of the 2022 reports.
  "goa-assembly-2022": { id: "goa-assembly-2022", state: "Goa", seats: 40, archive: `${OLD_ECI}/14168-goa-general-legislative-election-2022/` },
  "manipur-assembly-2022": { id: "manipur-assembly-2022", state: "Manipur", seats: 60, archive: `${OLD_ECI}/14166-manipur-general-legislative-election-2022/` },
  "punjab-assembly-2022": { id: "punjab-assembly-2022", state: "Punjab", seats: 117, archive: `${OLD_ECI}/14165-punjab-general-legislative-election-2022/` },
  "uttarakhand-assembly-2022": { id: "uttarakhand-assembly-2022", state: "Uttarakhand", seats: 70, archive: `${OLD_ECI}/14169-uttarakhand-general-legislative-election-2022/` },
  "uttar-pradesh-assembly-2022": { id: "uttar-pradesh-assembly-2022", state: "Uttar Pradesh", seats: 403, archive: `${OLD_ECI}/14185-uttar-pradesh-general-legislative-election-2022/` },
};

// File names on an archive page, which vary in their numbering and punctuation from state to state.
export const ARCHIVE_FILES = {
  detailed: /^10\s*[-.]\s*detailed results[^/]*\.xlsx$/i,
  winners: /^2\s*[-.]\s*list of successful candidates\.xlsx$/i,
  voters: /^12\s*[-.]\s*ac wise voters information\.xlsx$/i,
  parties: /^5\s*[-.]\s*performance of political parties\.xlsx$/i,
} as const;

// One address per report. An archive page holds all four, so each is told apart by a fragment.
export function assemblyFiles(election: AssemblyElection) {
  if (election.archive) {
    const at = (part: keyof typeof ARCHIVE_FILES) => `${election.archive}#${part}`;
    return { detailed: at("detailed"), winners: at("winners"), voters: at("voters"), parties: at("parties") };
  }
  return {
    detailed: `${election.base}/Detailed_Results.xlsx`,
    winners: `${election.base}/List_of_Successful_Candidates.xlsx`,
    voters: `${election.base}/AC_Wise_Voters_Information.xlsx`,
    parties: `${election.base}/Performance_of_Political_Parties.xlsx`,
  };
}

type Cell = string | number | null;

const HEADER = ["state/ut name", "ac no.", "ac name", "candidate name", "sex", "age", "category", "party", "symbol", "general", "postal", "total", "% votes polled", "total electors"];
const GENDER: Record<string, "female" | "male" | "third"> = { MALE: "male", M: "male", FEMALE: "female", F: "female", THIRD: "third", TG: "third", O: "third" };
const DISCLAIMER = "This report is based on Index Cards data made available by concerned Returning Officers on the basis of Statutory data maintained in the forms. In case of any dispute, the data maintained in the Statutory Forms by the concerned Returning Officers shall prevail.";

const clean = (value: Cell) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value);
const plain = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function rowsOf(bytes: Buffer): Cell[][] {
  const book = XLSX.read(bytes, { type: "buffer" });
  return XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[book.SheetNames[0]], { header: 1, defval: null, raw: true });
}

function title(rows: Cell[][], pattern: RegExp, label: string) {
  if (!rows.slice(0, 3).some((row) => typeof row[0] === "string" && pattern.test(row[0]))) throw new Error(`not an ECI ${label} report`);
  if (!rows.some((row) => clean(row[0]) === DISCLAIMER)) throw new Error(`${label}: ECI disclaimer missing or changed`);
}

function count(value: Cell, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative integer`);
  return value;
}

function text(value: Cell, label: string): string {
  const trimmed = clean(value);
  if (typeof trimmed !== "string" || !trimmed) throw new Error(`${label} is required`);
  return trimmed;
}

export interface AssemblyCandidateResult {
  [key: string]: JsonValue;
  election: string;
  personKey: string;
  state: string;
  constituency: string;
  seatNumber: number;
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

export interface ParsedAssembly {
  seats: { number: number; name: string; electors: number; rows: { excelRow: number; raw: Cell[]; name: string; nota: boolean }[] }[];
}

// Report 10. Every row adds up, every seat has one NOTA row and no tie for first place.
export function parseAssemblyDetailedResult(bytes: Buffer, election: AssemblyElection): ParsedAssembly {
  const rows = rowsOf(bytes);
  title(rows, /^10 - detailed results$/i, "detailed results");
  const headerRow = rows.findIndex((row) => String(clean(row[0]) ?? "").toLowerCase() === "state/ut name");
  if (headerRow < 0 || HEADER.some((label, index) => String(clean(rows[headerRow][index]) ?? "").toLowerCase() !== label)) throw new Error("report header changed");

  const seats = new Map<number, ParsedAssembly["seats"][number]>();
  rows.forEach((row, index) => {
    if (index <= headerRow || typeof row[1] !== "number") return;
    const excelRow = index + 1;
    if (text(row[0], `row ${excelRow} state`) !== election.state) throw new Error(`row ${excelRow} is not in ${election.state}`);
    const number = count(row[1], `row ${excelRow} seat number`);
    const name = text(row[2], `row ${excelRow} seat name`);
    const seat = seats.get(number) ?? { number, name, electors: count(row[13], `row ${excelRow} electors`), rows: [] };
    if (seat.name !== name) throw new Error(`row ${excelRow}: seat ${number} has two names`);
    if (row[13] !== seat.electors) throw new Error(`row ${excelRow}: electors differ within seat ${number}`);
    if (count(row[9], `row ${excelRow} general`) + count(row[10], `row ${excelRow} postal`) !== count(row[11], `row ${excelRow} total`)) {
      throw new Error(`row ${excelRow}: general and postal votes do not add up`);
    }
    const candidate = text(row[3], `row ${excelRow} candidate`);
    const nota = clean(row[7]) === "NOTA";
    // ECI numbers each row within the seat: "3 Nota", "1 Kalicharan Saraf".
    seat.rows.push({ excelRow, raw: row.slice(0, HEADER.length), name: candidate.replace(/^\d+\s+/, ""), nota });
    seats.set(number, seat);
  });
  const ordered = [...seats.values()].sort((a, b) => a.number - b.number);
  if (ordered.length !== election.seats) throw new Error(`expected ${election.seats} seats, found ${ordered.length}`);
  ordered.forEach((seat, index) => { if (seat.number !== index + 1) throw new Error(`seat numbers are not 1 to ${election.seats}`); });
  for (const seat of ordered) {
    if (seat.rows.filter((row) => row.nota).length !== 1) throw new Error(`${seat.name} needs exactly one NOTA row`);
    const people = seat.rows.filter((row) => !row.nota).sort((a, b) => (b.raw[11] as number) - (a.raw[11] as number));
    if (people.length < 2) throw new Error(`${seat.name} has fewer than two candidates`);
    if (people[0].raw[11] === people[1].raw[11]) throw new Error(`${seat.name} has a tie for first place`);
  }
  return { seats: ordered };
}

// The 2022 lists name the seat and winner only, so their number, votes, runner-up and margin are null.
export interface AssemblyWinner {
  number: number | null; seat: string; name: string; party: string;
  votes: number | null; runnerUp: string | null; runnerUpParty: string | null; runnerUpVotes: number | null; margin: number | null;
}

// Report 2.
export function parseAssemblyWinners(bytes: Buffer): AssemblyWinner[] {
  const rows = rowsOf(bytes);
  title(rows, /^2 - list of successful candidates$/i, "successful candidates");
  return rows.flatMap((row, index): AssemblyWinner[] => {
    if (typeof row[0] !== "string") return [];
    const at = `winners row ${index + 1}`;
    if (typeof row[1] === "string" && plain(row[0]) !== "state ut") {
      return [{
        number: null, seat: text(row[1], `${at} seat`), name: text(row[2], `${at} name`), party: text(row[4], `${at} party`),
        votes: null, runnerUp: null, runnerUpParty: null, runnerUpVotes: null, margin: null,
      }];
    }
    if (typeof row[1] !== "number") return [];
    return [{
      number: row[1], seat: text(row[2], `${at} seat`), name: text(row[3], `${at} name`), party: text(row[5], `${at} party`),
      votes: count(row[9], `${at} votes`), runnerUp: text(row[10], `${at} runner-up`), runnerUpParty: text(row[12], `${at} runner-up party`),
      runnerUpVotes: count(row[13], `${at} runner-up votes`), margin: count(row[14], `${at} margin`),
    }];
  });
}

export interface AssemblyTurnout { number: number; seat: string; electors: number; voted: number; nota: number; valid: number }

// Report 12.
export function parseAssemblyVoters(bytes: Buffer): AssemblyTurnout[] {
  const rows = rowsOf(bytes);
  title(rows, /^12 - ac wise voters information$/i, "AC-wise voters information");
  return rows.flatMap((row, index) => {
    if (typeof row[0] !== "number") return [];
    const at = `voters row ${index + 1}`;
    return [{ number: row[0], seat: text(row[1], `${at} seat`), electors: count(row[5], `${at} electors`), voted: count(row[13], `${at} voted`), nota: count(row[18], `${at} NOTA`), valid: count(row[19], `${at} valid votes`) }];
  });
}

// Report 5: seats won by each party abbreviation.
export function parsePartyWins(bytes: Buffer): Map<string, number> {
  const rows = rowsOf(bytes);
  title(rows, /^5 - performance of political parties$/i, "party performance");
  const wins = new Map<string, number>();
  for (const row of rows) if (typeof row[0] === "number" && typeof row[1] === "string" && typeof row[3] === "number") wins.set(row[1].trim(), row[3]);
  if (!wins.size) throw new Error("party performance report has no parties");
  return wins;
}

export interface AssemblyCheck { nameVariants: string[] }

// Every seat must agree with the winners list (party, and where given votes, runner-up votes and margin) and
// the voters report (electors, NOTA, valid votes), and every party's seat count must match report 5.
// A 2022 winners list has no seat numbers, so it is matched by seat name, which must then be unique.
export function crossCheckAssembly(report: ParsedAssembly, winners: AssemblyWinner[], turnout: AssemblyTurnout[], partyWins: Map<string, number>): AssemblyCheck {
  const byName = winners.length > 0 && winners.every((winner) => winner.number === null);
  if (!byName && winners.some((winner) => winner.number === null)) throw new Error("winners list mixes numbered and unnumbered rows");
  if (byName && new Set(report.seats.map((seat) => plain(seat.name))).size !== report.seats.length) throw new Error("two seats share a name, so the winners list cannot be matched");
  const winnerOf = new Map(winners.map((winner) => [byName ? plain(winner.seat) : winner.number, winner]));
  const turnoutOf = new Map(turnout.map((row) => [row.number, row]));
  if (winnerOf.size !== report.seats.length || turnoutOf.size !== report.seats.length) throw new Error("reference reports do not cover every seat");
  const nameVariants: string[] = [];
  const won = new Map<string, number>();
  for (const seat of report.seats) {
    const at = `${seat.number} ${seat.name}`;
    const people = seat.rows.filter((row) => !row.nota).sort((a, b) => (b.raw[11] as number) - (a.raw[11] as number));
    const [first, second] = people;
    const winner = winnerOf.get(byName ? plain(seat.name) : seat.number);
    const votes = turnoutOf.get(seat.number);
    if (!winner || !votes) throw new Error(`${at}: missing from a reference report`);
    if (plain(winner.seat) !== plain(seat.name) || plain(votes.seat) !== plain(seat.name)) throw new Error(`${at}: seat name differs between reports`);
    if (winner.party !== first.raw[7] || (winner.votes !== null && winner.votes !== first.raw[11])) throw new Error(`${at}: winner differs from the winners list`);
    if (winner.runnerUpVotes !== null && (winner.runnerUpParty !== second.raw[7] || winner.runnerUpVotes !== second.raw[11])) throw new Error(`${at}: runner-up differs from the winners list`);
    if (winner.margin !== null && winner.margin !== (first.raw[11] as number) - (second.raw[11] as number)) throw new Error(`${at}: margin differs from the winners list`);
    if (plain(winner.name) !== plain(first.name)) nameVariants.push(`${at}: "${first.name}" / "${winner.name}"`);
    if (votes.electors !== seat.electors) throw new Error(`${at}: electors differ from the voters report`);
    const nota = seat.rows.find((row) => row.nota)!;
    if (votes.nota !== nota.raw[11]) throw new Error(`${at}: NOTA differs from the voters report`);
    if (votes.valid !== people.reduce((sum, row) => sum + (row.raw[11] as number), 0)) throw new Error(`${at}: valid votes differ from the voters report`);
    won.set(first.raw[7] as string, (won.get(first.raw[7] as string) ?? 0) + 1);
  }
  for (const [party, seats] of partyWins) if ((won.get(party) ?? 0) !== seats) throw new Error(`${party}: ${won.get(party) ?? 0} wins in the results, ${seats} in report 5`);
  for (const [party, seats] of won) if (partyWins.get(party) !== seats) throw new Error(`${party} is missing from report 5`);
  return { nameVariants };
}

export function normalizeAssemblyResult(report: ParsedAssembly, turnout: AssemblyTurnout[], election: AssemblyElection, normalizedAt: string): ObservationDraft[] {
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be a UTC instant");
  const turnoutOf = new Map(turnout.map((row) => [row.number, row]));
  const drafts: ObservationDraft[] = [];
  for (const seat of report.seats) {
    const people = seat.rows.filter((row) => !row.nota);
    const ranked = [...people].sort((a, b) => (b.raw[11] as number) - (a.raw[11] as number));
    const votes = turnoutOf.get(seat.number)!;
    const nota = seat.rows.find((row) => row.nota)!;
    const contest = { electors: seat.electors, votesPolled: votes.voted, validVotes: votes.valid, notaVotes: nota.raw[11] as number, candidates: people.length };
    const names = new Map<string, number>();
    for (const row of people) names.set(slugify(row.name), (names.get(slugify(row.name)) ?? 0) + 1);
    const keys = new Set<string>();
    for (const row of people) {
      const { raw, excelRow } = row;
      const party = text(raw[7], `row ${excelRow} party`);
      const sex = clean(raw[4]);
      const gender = typeof sex === "string" ? GENDER[sex.toUpperCase()] : null;
      if (typeof sex === "string" && gender === undefined) throw new Error(`row ${excelRow} unknown sex ${sex}`);
      let personKey = `${election.id}/${slugify(election.state)}/${slugify(seat.name)}/${slugify(row.name)}`;
      if ((names.get(slugify(row.name)) ?? 0) > 1) personKey += `-${slugify(party)}`;
      if (keys.has(personKey)) personKey += `-row-${excelRow}`;
      keys.add(personKey);
      const total = raw[11] as number;
      const value: AssemblyCandidateResult = {
        election: election.id, personKey, state: election.state, constituency: seat.name, seatNumber: seat.number, name: row.name,
        gender: gender ?? null, age: typeof raw[5] === "number" ? raw[5] : null, category: typeof clean(raw[6]) === "string" ? clean(raw[6]) as string : null,
        party, partySymbol: typeof clean(raw[8]) === "string" ? clean(raw[8]) as string : null,
        votes: { general: raw[9] as number, postal: raw[10] as number, total },
        shareOfValidVotes: Math.round((total / votes.valid) * 10000) / 100,
        rank: ranked.indexOf(row) + 1,
        contest,
        derived: ["shareOfValidVotes"],
      };
      drafts.push({ locator: `Worksheet, row ${excelRow}`, predicate: "candidate.result", rawValue: JSON.stringify(raw), normalizedValue: value, normalizedAt, normalizerVersion: ECI_ASSEMBLY_NORMALIZER_VERSION });
    }
  }
  return drafts;
}
