import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findSeat, linkMpToSeat, sameName } from "./mp-seat-link";
import type { PublicMp } from "./public-mps";

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
