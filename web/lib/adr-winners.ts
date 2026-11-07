import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ChipSource } from "@/components/profile/SourceChip";
import { findSeat, linkMpToSeat, sameName } from "./mp-seat-link";
import type { ProfileMoney } from "./profile-model";
import type { PublicMp } from "./public-mps";
import type { ResultCandidate, ResultSeat } from "./results";

// What an MP declared in their affidavit, as compiled by ADR on MyNeta. The file is a private local
// export from `npm --prefix data run export:adr-winners`; without it, pages show no ADR figures.

export interface AdrWinner {
  state: string;
  constituency: string;
  name: string;
  party: string;
  byElection: boolean;
  education: string | null;
  age: number | null;
  cases: number | null;
  assets: number | null;
  liabilities: number | null;
  figuresFrom: "both" | "dataset" | "winners-page" | null;
  sourceUrl: string;
}

export interface AdrWinners { checkedOn: string; winners: AdrWinner[] }

export async function readAdrWinners(path?: string): Promise<AdrWinners | null> {
  const file = path ?? process.env.VOTE_BETTER_ADR_EXPORT ?? resolve(process.cwd(), "../data/raw/public-profiles/adr-winners-2024.json");
  try {
    const records = JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8"));
    if (records.schemaVersion !== 1 || records.sourceLabel !== "ADR/MyNeta" || !Array.isArray(records.winners)) return null;
    return { checkedOn: records.checkedOn, winners: records.winners };
  } catch {
    return null;
  }
}

const plain = (value: string) => value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]/g, "");

// Only one row may match. A wrong person's money and cases would be far worse than none, so anything
// else shows nothing. The seat and name must match; where ADR spells the name differently, an MP linked
// to the seat as its 2024 winner takes the seat's one general-election row, since both name that winner.
export function findAdrWinner(winners: readonly AdrWinner[], mp: Pick<PublicMp, "memberId" | "name" | "state" | "constituency">): AdrWinner | undefined {
  const seat = findSeat(mp.state, mp.constituency);
  const names = new Set([mp.constituency, seat?.name, seat?.sourceName].filter((name) => name !== undefined).map(plain));
  const atSeat = winners.filter((winner) => names.has(plain(winner.constituency)));
  const named = atSeat.filter((winner) => sameName(mp.name, winner.name));
  if (named.length) return named.length === 1 ? named[0] : undefined;
  if (linkMpToSeat(mp).status !== "won-2024" || !seat) return undefined;
  const general = atSeat.filter((winner) => !winner.byElection && plain(winner.state) === plain(seat.state));
  return general.length === 1 ? general[0] : undefined;
}

export interface AdrCandidates { checkedOn: string; candidates: AdrWinner[] }

// Every 2024 general-election candidate, from the same local export.
export async function readAdrCandidates(path?: string): Promise<AdrCandidates | null> {
  const file = path ?? process.env.VOTE_BETTER_ADR_CANDIDATES ?? resolve(process.cwd(), "../data/raw/public-profiles/adr-candidates-2024.json");
  try {
    const records = JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8"));
    if (records.schemaVersion !== 1 || records.sourceLabel !== "ADR/MyNeta" || !Array.isArray(records.candidates)) return null;
    return { checkedOn: records.checkedOn, candidates: records.candidates };
  } catch {
    return null;
  }
}

// Where ADR spells a state or seat differently from ECI, checked by hand against both lists.
const ADR_STATES: Record<string, string> = { "NCT OF Delhi": "Delhi" };
const ADR_SEATS: Record<string, string> = { Kurnoolu: "Kurnool", Patliputra: "Pataliputra", Baharaich: "Bahraich", "Bardhaman-Durgapur": "Burdwan - Durgapur" };

// One to one within the seat: exactly one ADR row has this candidate's name, and no one else on the
// ballot could also be that row. Anything less shows nothing.
export function findAdrCandidate(rows: readonly AdrWinner[], seat: Pick<ResultSeat, "state" | "name" | "sourceName"> & { candidates: readonly Pick<ResultCandidate, "slug" | "name">[] }, candidate: Pick<ResultCandidate, "slug" | "name">): AdrWinner | undefined {
  const state = plain(ADR_STATES[seat.state] ?? seat.state);
  const names = new Set([seat.name, seat.sourceName, ADR_SEATS[seat.name]].filter((name) => name !== undefined).map(plain));
  const named = rows.filter((row) => !row.byElection && plain(row.state) === state && names.has(plain(row.constituency)) && sameName(candidate.name, row.name));
  if (named.length !== 1) return undefined;
  const rivals = seat.candidates.filter((other) => other.slug !== candidate.slug && sameName(other.name, named[0].name));
  return rivals.length ? undefined : named[0];
}

// The figures a profile shows from an ADR row, with a source chip that says how far they were checked.
export function adrMoney(row: AdrWinner, checkedOn: string): { money: ProfileMoney; source: ChipSource } {
  const source: ChipSource = {
    label: "ADR", title: `ADR / MyNeta summary of ${row.name}'s 2024 affidavit`, url: row.sourceUrl, checkedOn,
    locator: `Self-declared figures compiled by ADR from the ECI affidavit${row.figuresFrom === "dataset" ? ", read from a public copy of ADR's data and not checked against a second copy" : ""}. ECI's filing is the record if they differ.`,
  };
  return {
    source,
    money: {
      election: row.byElection ? "2024 bye-election" : "2024",
      ...(row.assets !== null ? { assets: row.assets } : {}),
      ...(row.liabilities !== null ? { liabilities: row.liabilities } : {}),
      ...(row.cases !== null ? { cases: row.cases } : {}),
      ...(row.education ? { education: row.education } : {}),
      ...(row.age !== null ? { age: row.age } : {}),
      source,
    },
  };
}
