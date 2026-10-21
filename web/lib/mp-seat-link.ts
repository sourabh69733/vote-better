import { loadLokSabha2024, type Candidate, type Seat } from "./lok-sabha-2024";
import { sortableMpName } from "./mp-directory";
import { listPublicMps, type PublicMp } from "./public-mps";
import { byElections, nameVariants, seatAliases } from "@/records/mp-seat-links";

export type MpSeatLink =
  | { status: "won-2024"; seat: Seat; candidate: Candidate | null }
  | { status: "by-election"; seat: Seat; note: string }
  | { status: "unlinked" };

const plain = (value: string) => value.toLowerCase().normalize("NFKD").replace(/&/g, " and ").replace(/[^a-z]+/g, " ").trim();
const tokens = (name: string) => plain(sortableMpName(name)).split(" ").filter((token) => token.length > 1);

// Same name, ignoring titles and order, or one name containing every word of the other.
export function sameName(a: string, b: string) {
  const [x, y] = [tokens(a), tokens(b)];
  if (x.join("") === y.join("")) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 2 && short.every((token) => long.includes(token));
}

export function findSeat(state: string, constituency: string): Seat | undefined {
  const seats = loadLokSabha2024().seats;
  const alias = seatAliases[constituency];
  return seats.find((seat) => plain(seat.state) === plain(state) &&
    (alias ? seat.slug === alias : plain(seat.sourceName) === plain(constituency)));
}

// A link is shown only when the MP is the seat's 2024 winner, or a reviewed exception says so.
export function linkMpToSeat(mp: Pick<PublicMp, "memberId" | "name" | "state" | "constituency">): MpSeatLink {
  const seat = findSeat(mp.state, mp.constituency);
  if (!seat) return { status: "unlinked" };
  if (byElections[mp.memberId]) return { status: "by-election", seat, note: byElections[mp.memberId] };
  const winnerName = seat.unopposed?.winner ?? seat.candidates[0]?.sourceName;
  const approved = nameVariants[mp.memberId];
  if (approved ? approved === winnerName : winnerName && sameName(mp.name, winnerName)) {
    return { status: "won-2024", seat, candidate: seat.candidates[0] ?? null };
  }
  return { status: "unlinked" };
}

// The sitting MP whose record links to this seat as its 2024 winner, if the MP export is available.
export async function findMpForSeat(seat: Pick<Seat, "stateSlug" | "slug">): Promise<PublicMp | undefined> {
  return (await listPublicMps()).find((mp) => {
    const link = linkMpToSeat(mp);
    return link.status === "won-2024" && link.seat.stateSlug === seat.stateSlug && link.seat.slug === seat.slug;
  });
}
