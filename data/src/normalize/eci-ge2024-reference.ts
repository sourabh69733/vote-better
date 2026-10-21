import * as XLSX from "xlsx";

const BASE = "https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report";
export const ECI_GE2024_PARTY_LIST_URL = `${BASE}/3-List-Of-Political-Parties-Participated.xlsx`;
export const ECI_GE2024_WINNERS_URL = `${BASE}/4-List-Of-Successful-Candidate.xls`;
export const ECI_GE2024_SURAT_URL = `${BASE}/2A-Constituency-Data-Summery-Report-For-pc-Surat.xls`;

export const XLSX_DOCUMENT = {
  label: "XLSX", accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  contentTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
  magic: Buffer.from("504b0304", "hex"),
};

type Cell = string | number | null;

function sheetRows(bytes: Buffer): Cell[][] {
  const book = XLSX.read(bytes, { type: "buffer" });
  return XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[book.SheetNames[0]], { header: 1, defval: null, raw: true });
}

function text(value: Cell, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function count(value: Cell, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative integer`);
  return value;
}

export interface Party { abbreviation: string; name: string; type: string; symbol: string | null; excelRow: number }

const PARTY_TYPES: Record<string, string> = {
  N: "National party", S: "State party", U: "Registered (unrecognised) party", Z: "Independent", Z1: "None of the above",
};

export function parsePartyList(bytes: Buffer): Party[] {
  const rows = sheetRows(bytes);
  if (rows[0]?.[0] !== "3. LIST OF POLITICAL PARTIES PARTICIPATED") throw new Error("not ECI report 3");
  if (["Sr. No.", "PARTY TYPE", "ABBREVIATION", "PARTY SYMBOL", "PARTY NAME"].some((label, index) => rows[1]?.[index] !== label)) {
    throw new Error("party list header changed");
  }
  const parties: Party[] = [];
  rows.forEach((row, index) => {
    if (index < 2 || typeof row[0] !== "number" || typeof row[2] !== "string") return;
    const type = text(row[1], `row ${index + 1} party type`);
    parties.push({
      abbreviation: text(row[2], `row ${index + 1} abbreviation`), name: text(row[4], `row ${index + 1} party name`),
      type: PARTY_TYPES[type] ?? type,
      // The independents' row lists every free symbol, not one party symbol.
      symbol: type === "Z" || typeof row[3] !== "string" ? null : row[3].trim(), excelRow: index + 1,
    });
    if (!PARTY_TYPES[type]) throw new Error(`row ${index + 1} unknown party type ${type}`);
  });
  const summary = (label: string) => rows.find((row) => row[1] === label)?.[2];
  const counted = (type: string) => parties.filter((party) => party.type === PARTY_TYPES[type]).length;
  if (summary("NATIONAL PARTIES") !== counted("N") || summary("STATE PARTIES") !== counted("S") ||
    summary("REGISTERED(UNRECOGNISED) PARTIES") !== counted("U")) throw new Error("party counts do not match the report summary");
  if (new Set(parties.map((party) => party.abbreviation)).size !== parties.length) throw new Error("duplicate party abbreviation");
  return parties;
}

export interface SeatSummary {
  state: string; number: number; constituency: string; reservation: string; validVotes: number;
  winner: { name: string; party: string; votes: number }; runnerUp: { name: string; party: string; votes: number };
  margin: number; excelRow: number;
}

const WINNER_HEADER = ["SL. NO.", "State", "Const No.", "Constituency", "Constituency Type", "Total Valid Votes", "Winner Name"];

export function parseSuccessfulCandidates(bytes: Buffer): SeatSummary[] {
  const rows = sheetRows(bytes);
  if (rows[0]?.[0] !== "4. List Of Successful Candidate") throw new Error("not ECI report 4");
  const headerRow = rows.findIndex((row) => row[0] === "SL. NO.");
  if (headerRow < 0 || WINNER_HEADER.some((label, index) => rows[headerRow][index] !== label)) throw new Error("winner list header changed");
  const seats: SeatSummary[] = [];
  rows.forEach((row, index) => {
    if (index <= headerRow || typeof row[0] !== "number") return;
    const label = `row ${index + 1}`;
    const winnerVotes = count(row[11], `${label} winner votes`);
    const runnerVotes = count(row[17], `${label} runner-up votes`);
    const margin = count(row[18], `${label} margin`);
    if (winnerVotes - runnerVotes !== margin) throw new Error(`${label} margin does not match votes`);
    seats.push({
      state: text(row[1], `${label} state`), number: count(row[2], `${label} seat number`),
      constituency: text(row[3], `${label} constituency`), reservation: text(row[4], `${label} type`),
      validVotes: count(row[5], `${label} valid votes`),
      winner: { name: text(row[6], `${label} winner`), party: text(row[9], `${label} winner party`), votes: winnerVotes },
      runnerUp: { name: text(row[12], `${label} runner-up`), party: text(row[15], `${label} runner-up party`), votes: runnerVotes },
      margin, excelRow: index + 1,
    });
  });
  return seats;
}

export interface UnopposedSeat {
  state: string; number: number; constituency: string; reservation: string;
  winner: { name: string; party: string }; nominated: number; rejected: number; withdrawn: number;
}

export function parseSuratSummary(bytes: Buffer): UnopposedSeat {
  const rows = sheetRows(bytes);
  if (rows[0]?.[0] !== "2A - CONSTITUENCY DATA SUMMARY FOR PC - SURAT") throw new Error("not ECI report 2A");
  const find = (label: string) => rows.find((row) => row[1] === label);
  const total = (label: string) => count(find(label)?.[6] ?? null, label);
  const [constituency, reservation] = text(rows[1]?.[3], "constituency").split("-");
  const winner = find("Winner");
  if (total("Contested") !== 1) throw new Error("Surat summary no longer shows an unopposed seat");
  return {
    state: text(rows[1]?.[1], "state").split("-")[0], number: count(rows[1]?.[5], "seat number"),
    constituency, reservation,
    winner: { name: text(winner?.[4] ?? null, "winner name"), party: text(winner?.[3] ?? null, "winner party") },
    nominated: total("Nominated"), rejected: total("Nomination Rejected"), withdrawn: total("Withdrawn"),
  };
}

export interface CrossCheckRow { state: string; constituency: string; rank: number; name: string; party: string; votes: number; validVotes: number }

// Report 4 must agree with report 33 on every winner and runner-up. ECI spells
// some runner-up names differently between reports, so those are listed, not fatal.
export function crossCheckWinners(seats: readonly SeatSummary[], results: readonly CrossCheckRow[]): { nameVariants: string[] } {
  const key = (state: string, constituency: string) => `${state}|${constituency}`.toLowerCase();
  const bySeat = new Map<string, CrossCheckRow[]>();
  for (const row of results) {
    const list = bySeat.get(key(row.state, row.constituency)) ?? [];
    list[row.rank - 1] = row;
    bySeat.set(key(row.state, row.constituency), list);
  }
  if (bySeat.size !== seats.length) throw new Error(`report 4 has ${seats.length} seats, results have ${bySeat.size}`);
  const nameVariants: string[] = [];
  for (const seat of seats) {
    const [first, second] = bySeat.get(key(seat.state, seat.constituency)) ?? [];
    const where = `${seat.constituency}, ${seat.state}`;
    if (!first || !second) throw new Error(`${where} missing from results`);
    if (first.name !== seat.winner.name || first.votes !== seat.winner.votes || first.party !== seat.winner.party || first.validVotes !== seat.validVotes) {
      throw new Error(`${where} winner differs between reports`);
    }
    if (second.votes !== seat.runnerUp.votes || second.party !== seat.runnerUp.party) throw new Error(`${where} runner-up differs between reports`);
    if (second.name !== seat.runnerUp.name) nameVariants.push(`${where}: "${second.name}" / "${seat.runnerUp.name}"`);
  }
  return { nameVariants };
}
