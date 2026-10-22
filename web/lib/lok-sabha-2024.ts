import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface Candidate {
  slug: string;
  name: string;
  sourceName: string;
  party: string;
  partySymbol: string | null;
  gender: "female" | "male" | "third" | null;
  age: number | null;
  category: string | null;
  votes: number;
  postalVotes: number;
  shareOfValidVotes: number;
  rank: number;
  factId: string;
  locator: string;
  reviewedAt: string;
}

export interface Seat {
  state: string;
  stateSlug: string;
  number: number;
  reservation: string;
  name: string;
  sourceName: string;
  slug: string;
  unopposed: null | { winner: string; party: string; nominated: number; rejected: number; withdrawn: number };
  electors: number | null;
  votesPolled: number | null;
  validVotes: number | null;
  notaVotes: number | null;
  candidates: Candidate[];
}

export interface SourceFile { title: string; url: string; contentHash: string; capturedAt: string }

export interface LokSabha2024 {
  election: { id: "lok-sabha-2024"; name: string; seats: number };
  parties: Record<string, { name: string; type: string }>;
  source: SourceFile & { authority: string; note: string; disclaimer: string };
  references: SourceFile[];
  checks: { winnersMatchReport4: boolean; runnerUpNameVariants: string[] };
  revisionId: string;
  publishedAt: string;
  seats: Seat[];
}

const sha256 = /^sha256:[0-9a-f]{64}$/;

export function validateLokSabha2024(value: unknown): asserts value is LokSabha2024 {
  const data = value as LokSabha2024;
  if (data?.election?.id !== "lok-sabha-2024" || !Array.isArray(data.seats)) throw new Error("not a Lok Sabha 2024 publication");
  if (data.seats.length !== data.election.seats) throw new Error("seat count mismatch");
  if (!data.source.url.startsWith("https://") || !sha256.test(data.source.contentHash)) throw new Error("invalid source");
  if (!data.checks?.winnersMatchReport4) throw new Error("winner cross-check missing");
  const keys = new Set<string>();
  for (const seat of data.seats) {
    const key = `${seat.stateSlug}/${seat.slug}`;
    if (keys.has(key)) throw new Error(`duplicate seat ${key}`);
    keys.add(key);
    if (seat.unopposed) {
      if (seat.candidates.length) throw new Error(`${key} is unopposed but lists candidates`);
      continue;
    }
    if (!seat.candidates.length || seat.candidates[0].rank !== 1) throw new Error(`${key} has no winner`);
    const slugs = new Set<string>();
    seat.candidates.forEach((candidate, index) => {
      if (candidate.rank !== index + 1) throw new Error(`${key} candidates out of order`);
      if (slugs.has(candidate.slug)) throw new Error(`${key} duplicate candidate ${candidate.slug}`);
      slugs.add(candidate.slug);
      if (!data.parties[candidate.party]) throw new Error(`${key} unknown party ${candidate.party}`);
      if (!/^Worksheet, row \d+$/.test(candidate.locator)) throw new Error(`${key} candidate without source row`);
    });
  }
}

let cached: LokSabha2024 | undefined;

export function loadLokSabha2024(): LokSabha2024 {
  if (cached) return cached;
  const parsed: unknown = JSON.parse(readFileSync(join(process.cwd(), "records", "generated", "lok-sabha-2024.json"), "utf8"));
  validateLokSabha2024(parsed);
  cached = parsed;
  return parsed;
}

export function getSeat(stateSlug: string, seatSlug: string): Seat | undefined {
  return loadLokSabha2024().seats.find((seat) => seat.stateSlug === stateSlug && seat.slug === seatSlug);
}

export function getCandidate(stateSlug: string, seatSlug: string, candidateSlug: string) {
  const seat = getSeat(stateSlug, seatSlug);
  const candidate = seat?.candidates.find((item) => item.slug === candidateSlug);
  return seat && candidate ? { seat, candidate } : undefined;
}

export function seatHref(seat: Pick<Seat, "stateSlug" | "slug">) {
  return `/seats/${seat.stateSlug}/${seat.slug}`;
}

export function candidateHref(seat: Pick<Seat, "stateSlug" | "slug">, candidate: Pick<Candidate, "slug">) {
  return `${seatHref(seat)}/${candidate.slug}`;
}

export function winnerOf(seat: Seat) {
  return seat.unopposed ? null : seat.candidates[0];
}

const plain = (value: string) => value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, " ").trim();

// Search by seat, state, or the name of anyone who contested.
export function searchSeats(query: string, limit = 60) {
  const words = plain(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const matches: { seat: Seat; matchedCandidate?: Candidate; score: number }[] = [];
  for (const seat of loadLokSabha2024().seats) {
    const seatText = plain(`${seat.name} ${seat.state}`);
    if (words.every((word) => seatText.includes(word))) {
      matches.push({ seat, score: plain(seat.name).startsWith(words.join(" ")) ? 3 : 2 });
      continue;
    }
    const person = seat.candidates.find((candidate) => words.every((word) => plain(candidate.name).includes(word)));
    if (person) matches.push({ seat, matchedCandidate: person, score: person.rank === 1 ? 1.5 : 1 });
    else if (seat.unopposed && words.every((word) => plain(seat.unopposed!.winner).includes(word))) matches.push({ seat, score: 1.5 });
  }
  return matches.sort((a, b) => b.score - a.score || a.seat.name.localeCompare(b.seat.name)).slice(0, limit);
}

export const formatNumber = (value: number) => value.toLocaleString("en-IN");

export function marginOf(seat: Seat, candidate: Candidate) {
  const winner = seat.candidates[0];
  if (candidate.rank === 1) {
    const runnerUp = seat.candidates[1];
    return runnerUp ? { kind: "won" as const, votes: candidate.votes - runnerUp.votes, other: runnerUp } : null;
  }
  return { kind: "behind" as const, votes: winner.votes - candidate.votes, other: winner };
}

// Short Indian form for reading: 3,72,032 -> "3.72 lakh". Exact figures stay on the page.
export function formatShort(value: number) {
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");
  if (value >= 10_000_000) return `${trim(value / 10_000_000)} crore`;
  if (value >= 100_000) return `${trim(value / 100_000)} lakh`;
  return formatNumber(value);
}

// One plain sentence built only from the published result.
export function summaryOf(seat: Seat, candidate: Candidate, partyName: (code: string) => string) {
  const margin = marginOf(seat, candidate);
  const share = `${Math.round(candidate.shareOfValidVotes)}% of valid votes`;
  const votes = `Got ${formatShort(candidate.votes)} votes (${share}) in ${seat.name}.`;
  if (!margin) return `${votes} Was the only candidate on the ballot.`;
  if (margin.kind === "won") {
    return `${votes} Won by ${formatShort(margin.votes)} votes over ${margin.other.name} (${partyName(margin.other.party)}).`;
  }
  return `${votes} Finished ${candidate.rank} of ${seat.candidates.length}, ${formatShort(margin.votes)} votes behind the winner, ${margin.other.name} (${partyName(margin.other.party)}).`;
}

// Where this seat's winning margin ranks among the contested seats in its state.
export function marginRankInState(seat: Seat) {
  const margins = loadLokSabha2024().seats
    .filter((item) => item.state === seat.state && item.candidates.length > 1)
    .map((item) => ({ key: item.slug, margin: item.candidates[0].votes - item.candidates[1].votes }))
    .sort((a, b) => b.margin - a.margin);
  const rank = margins.findIndex((item) => item.key === seat.slug) + 1;
  return rank ? { rank, total: margins.length } : null;
}
