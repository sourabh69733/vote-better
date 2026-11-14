import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { summarizeFunds, type FundPublication } from "./mp-funds";
import { findSeat, sameName } from "./mp-seat-link";
import { findSeat as findResultSeat, type ResultSeat } from "./results";
import { esakshiSeats, esakshiWinnerNames } from "@/records/esakshi-links";

// Fund works for every Lok Sabha seat, collected by data/src/mplads-all-members.ts. MoSPI's reuse terms are
// still to be confirmed, so this file is local only and is never deployed.

interface SeatFunds extends FundPublication { members: (FundPublication["members"][number] & { state: string; constituencyId: number })[] }

// eSAKSHI writes "UDAIPUR(ST)" and "The Dadra And Nagar Haveli And Daman And Diu"; results write neither.
export const esakshiSeatName = (constituency: string) => constituency.replace(/\s*\((SC|ST)\)\s*$/i, "");
export const esakshiStateName = (state: string) => state.replace(/^the\s+/i, "");

// Kept once read; a missing file is looked for again, so a local archive added later is picked up.
let index: { publication: SeatFunds; bySeat: Map<string, SeatFunds["members"][number]> } | undefined;

function load(path: string) {
  if (index) return index;
  let publication: SeatFunds;
  try {
    publication = JSON.parse(readFileSync(path, "utf8")) as SeatFunds;
  } catch {
    return undefined;
  }
  const bySeat = new Map<string, SeatFunds["members"][number]>();
  for (const member of publication.members) {
    const reviewed = esakshiSeats[member.constituencyId]?.split("/");
    const seat = reviewed ? findResultSeat("lok-sabha-2024", reviewed[0], reviewed[1]) : findSeat(esakshiStateName(member.state), esakshiSeatName(member.constituency));
    if (seat) bySeat.set(`${seat.stateSlug}/${seat.slug}`, member);
  }
  index = { publication, bySeat };
  return index;
}

// The seat's fund works, shown only when eSAKSHI names the same MP, so a seat that changed hands after
// a bye-election never shows another member's works. A reviewed spelling of the 2024 winner's name counts
// only on the 2024 winner's own pages.
export function getSeatFunds(seat: Pick<ResultSeat, "stateSlug" | "slug">, mp: { names: string[]; winner2024: boolean }, path = process.env.MPLADS_ALL_FILE ?? resolve(process.cwd(), "../data/raw/mplads/archive-all-members.json")) {
  const loaded = load(path);
  const member = loaded?.bySeat.get(`${seat.stateSlug}/${seat.slug}`);
  if (!loaded || !member) return null;
  const reviewed = mp.winner2024 && esakshiWinnerNames[member.constituencyId] === member.officialName;
  if (!reviewed && !mp.names.some((name) => sameName(name, member.officialName))) return null;
  return summarizeFunds(loaded.publication, member.personId);
}

// Seats on eSAKSHI that no 2024 seat matched, for checking the archive.
export function unmatchedSeats(path = process.env.MPLADS_ALL_FILE ?? resolve(process.cwd(), "../data/raw/mplads/archive-all-members.json")) {
  const loaded = load(path);
  if (!loaded) return null;
  const matched = new Set(loaded.bySeat.values());
  return loaded.publication.members.filter((member) => !matched.has(member)).map((member) => `${member.state} / ${member.constituency}`);
}
