import * as XLSX from "xlsx";

import type { HistoryYear, ParsedHistory } from "./eci-history-detailed-result.js";

// Winners and party lists for 2019 and 2014. The winners list covers every seat,
// including seats missing from ECI's detailed result file.

type Cell = string | number | null;

const clean = (value: Cell) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value);
const plain = (value: string) => value.toLowerCase().normalize("NFKD").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

function sheet(bytes: Buffer): Cell[][] {
  const book = XLSX.read(bytes, { type: "buffer" });
  return XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[book.SheetNames[0]], { header: 1, defval: null, raw: true });
}

export interface HistoryParty { abbreviation: string; name: string; type: string; symbol: string | null }

export function parseHistoryPartyList(bytes: Buffer): HistoryParty[] {
  const rows = sheet(bytes);
  if (!rows.slice(0, 3).some((row) => row.some((cell) => typeof cell === "string" && /list of political parties participated/i.test(cell)))) {
    throw new Error("not an ECI party list");
  }
  const header = rows.findIndex((row) => String(clean(row[2]) ?? "").toUpperCase() === "ABBREVIATION");
  if (header < 0 || String(clean(rows[header][4]) ?? "").toUpperCase() !== "PARTY NAME") throw new Error("party list header changed");
  const parties = rows.slice(header + 1)
    .filter((row) => typeof row[0] === "number" && typeof clean(row[2]) === "string" && typeof clean(row[4]) === "string")
    .map((row) => ({
      abbreviation: clean(row[2]) as string, name: clean(row[4]) as string, type: String(clean(row[1]) ?? ""),
      symbol: typeof clean(row[3]) === "string" ? clean(row[3]) as string : null,
    }));
  if (parties.length < 100) throw new Error("party list incomplete");
  return parties;
}

// ECI's 2019 list gives one code to two parties (CPIM). When a code is shared, the
// election symbol decides; if it does not single out one party, the name stays unknown.
export function resolveParty(parties: readonly HistoryParty[], code: string, symbol: string | null): HistoryParty | null {
  const matches = parties.filter((party) => party.abbreviation === code);
  if (matches.length === 1) return matches[0];
  const bySymbol = matches.filter((party) => symbol && party.symbol && plain(party.symbol) === plain(symbol));
  return bySymbol.length === 1 ? bySymbol[0] : null;
}

export interface HistoryWinner { state: string; constituency: string; name: string; party: string; reservation: string; margin: number; excelRow: number }

export function parseHistoryWinners(bytes: Buffer): HistoryWinner[] {
  const rows = sheet(bytes);
  const header = rows.findIndex((row) => String(clean(row[3]) ?? "").toUpperCase() === "WINNER NAME");
  if (header < 0 || String(clean(rows[header][8]) ?? "").toUpperCase() !== "MARGIN") throw new Error("winners list header changed");
  const winners = rows.slice(header + 1).flatMap((row, index) => typeof row[0] !== "number" ? [] : [{
    state: clean(row[1]) as string, constituency: clean(row[2]) as string, name: clean(row[3]) as string,
    reservation: clean(row[4]) as string, party: clean(row[6]) as string, margin: row[8] as number, excelRow: header + index + 2,
  }]);
  if (winners.length !== 543) throw new Error(`expected 543 winners, found ${winners.length}`);
  for (const winner of winners) {
    if (!winner.state || !winner.constituency || !winner.name || !winner.party || !Number.isSafeInteger(winner.margin) || winner.margin < 0) {
      throw new Error(`winners row ${winner.excelRow} is incomplete`);
    }
  }
  return winners;
}

const seatKey = (state: string, constituency: string) => `${plain(state)}|${plain(constituency)}`;

// Every winner in the detailed results must match the winners list on name, party and margin.
// Seats missing from the detailed file are returned so they can be shown as winner-only.
export function crossCheckHistory(year: HistoryYear, results: ParsedHistory, winners: HistoryWinner[], parties: HistoryParty[]) {

  const bySeat = new Map<string, ParsedHistory["candidates"][number]["value"][]>();
  for (const { value } of results.candidates) {
    const key = seatKey(value.state, value.constituency);
    const list = bySeat.get(key) ?? [];
    list[value.rank - 1] = value;
    bySeat.set(key, list);
  }
  const winnerOnly: HistoryWinner[] = [];
  const nameVariants: string[] = [];
  for (const winner of winners) {
    const seat = bySeat.get(seatKey(winner.state, winner.constituency));
    if (!seat) { winnerOnly.push(winner); continue; }
    const [first, second] = seat;
    const where = `${winner.constituency}, ${winner.state} (${year})`;
    const resolved = resolveParty(parties, first.party, first.partySymbol);
    const sameParty = winner.party === first.party || (resolved !== null && plain(winner.party) === plain(resolved.name));
    if (!sameParty) throw new Error(`${where}: winner's party differs between reports`);
    if (second && first.votes.total - second.votes.total !== winner.margin) throw new Error(`${where}: margin differs between reports`);
    if (plain(winner.name) !== plain(first.name)) nameVariants.push(`${where}: "${first.name}" / "${winner.name}"`);
  }
  if (bySeat.size + winnerOnly.length !== 543) throw new Error(`${year}: ${bySeat.size} result seats and ${winnerOnly.length} winner-only seats do not make 543`);
  return { winnerOnly, nameVariants };
}
