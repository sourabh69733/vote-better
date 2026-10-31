import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Lok Sabha results for every election the site has published, in one shape.
// 2024 also has its own module (lok-sabha-2024.ts) for the seat and candidate pages built first.

export const RESULT_ELECTIONS = ["lok-sabha-2024", "lok-sabha-2019", "lok-sabha-2014"] as const;
export type ResultElectionId = (typeof RESULT_ELECTIONS)[number];

export interface ResultCandidate {
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

export interface ResultSeat {
  state: string;
  stateSlug: string;
  // Older reports carry no seat number.
  number: number | null;
  reservation: string;
  name: string;
  sourceName: string;
  slug: string;
  unopposed: null | { winner: string; party: string; nominated: number; rejected: number; withdrawn: number };
  // Seats ECI's detailed file leaves out: winner and margin from its winners list only.
  winnerOnly?: null | { winner: string; party: string; margin: number };
  electors: number | null;
  votesPolled: number | null;
  validVotes: number | null;
  notaVotes: number | null;
  candidates: ResultCandidate[];
}

export interface ResultFile { title: string; url: string; contentHash: string; capturedAt: string }

export interface LokSabhaResults {
  election: { id: ResultElectionId; name: string; seats: number };
  parties: Record<string, { name: string; type: string }>;
  source: ResultFile & { authority: string; note: string; disclaimer: string };
  references: ResultFile[];
  checks: { winnersMatchReport4: boolean; runnerUpNameVariants: string[] };
  revisionId: string;
  publishedAt: string;
  seats: ResultSeat[];
}

const sha256 = /^sha256:[0-9a-f]{64}$/;

export function isResultElection(id: string): id is ResultElectionId {
  return (RESULT_ELECTIONS as readonly string[]).includes(id);
}

export function validateResults(value: unknown, id: ResultElectionId): asserts value is LokSabhaResults {
  const data = value as LokSabhaResults;
  if (data?.election?.id !== id || !Array.isArray(data.seats)) throw new Error(`not the ${id} publication`);
  if (data.seats.length !== data.election.seats) throw new Error(`${id}: seat count mismatch`);
  if (!data.source?.url?.startsWith("https://") || !sha256.test(data.source.contentHash)) throw new Error(`${id}: invalid source`);
  if (!data.checks?.winnersMatchReport4) throw new Error(`${id}: winner cross-check missing`);
  const keys = new Set<string>();
  for (const seat of data.seats) {
    const key = `${id} ${seat.stateSlug}/${seat.slug}`;
    if (keys.has(key)) throw new Error(`duplicate seat ${key}`);
    keys.add(key);
    if (seat.unopposed || seat.winnerOnly) {
      if (seat.candidates.length) throw new Error(`${key} has a winner only but lists candidates`);
      if (!data.parties[(seat.unopposed ?? seat.winnerOnly)!.party]) throw new Error(`${key} unknown party`);
      continue;
    }
    if (!seat.candidates.length || seat.candidates[0].rank !== 1) throw new Error(`${key} has no winner`);
    seat.candidates.forEach((candidate, index) => {
      if (candidate.rank !== index + 1) throw new Error(`${key} candidates out of order`);
      if (!data.parties[candidate.party]) throw new Error(`${key} unknown party ${candidate.party}`);
      if (!/^Worksheet, row \d+$/.test(candidate.locator)) throw new Error(`${key} candidate without source row`);
    });
  }
}

const cache = new Map<ResultElectionId, LokSabhaResults | null>();

// Undefined when the election's results have not been published to this site.
export function loadResults(id: ResultElectionId): LokSabhaResults | undefined {
  if (!cache.has(id)) {
    const file = join(process.cwd(), "records", "generated", `${id}.json`);
    if (!existsSync(file)) cache.set(id, null);
    else {
      const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
      validateResults(parsed, id);
      cache.set(id, parsed);
    }
  }
  return cache.get(id) ?? undefined;
}

export const yearOf = (id: ResultElectionId) => Number(id.slice(-4));

// 2024 seats keep their original pages with candidate profiles.
export function contestHref(id: ResultElectionId, seat: Pick<ResultSeat, "stateSlug" | "slug">) {
  return id === "lok-sabha-2024" ? `/seats/${seat.stateSlug}/${seat.slug}` : `/elections/${id}/${seat.stateSlug}/${seat.slug}`;
}

export function findSeat(id: ResultElectionId, stateSlug: string, seatSlug: string) {
  return loadResults(id)?.seats.find((seat) => seat.stateSlug === stateSlug && seat.slug === seatSlug);
}

export interface SeatWinner { name: string; party: string; margin: number | null; share: number | null; how: "contested" | "unopposed" | "winner-only" }

export function seatWinner(seat: ResultSeat): SeatWinner | null {
  if (seat.unopposed) return { name: seat.unopposed.winner, party: seat.unopposed.party, margin: null, share: null, how: "unopposed" };
  if (seat.winnerOnly) return { name: seat.winnerOnly.winner, party: seat.winnerOnly.party, margin: seat.winnerOnly.margin, share: null, how: "winner-only" };
  const [first, second] = seat.candidates;
  if (!first) return null;
  return { name: first.name, party: first.party, margin: second ? first.votes - second.votes : null, share: first.shareOfValidVotes, how: "contested" };
}

export function turnout(seat: Pick<ResultSeat, "electors" | "votesPolled">) {
  return seat.electors && seat.votesPolled !== null ? (seat.votesPolled / seat.electors) * 100 : null;
}

// Every seat in a state with a known margin, widest first.
export function marginsInState(results: LokSabhaResults, stateSlug: string) {
  return results.seats
    .filter((seat) => seat.stateSlug === stateSlug)
    .map((seat) => ({ seat, margin: seatWinner(seat)?.margin ?? null }))
    .filter((row): row is { seat: ResultSeat; margin: number } => row.margin !== null)
    .sort((a, b) => b.margin - a.margin);
}

// The same seat in every published election, matched by state and seat name.
// Seats that were renamed, redrawn or moved state are not matched.
export function seatHistory(stateSlug: string, seatSlug: string) {
  return RESULT_ELECTIONS.flatMap((id) => {
    const seat = findSeat(id, stateSlug, seatSlug);
    const results = loadResults(id);
    if (!seat || !results) return [];
    const winner = seatWinner(seat);
    return winner ? [{ id, year: yearOf(id), seat, winner, partyName: results.parties[winner.party]?.name ?? winner.party }] : [];
  });
}

export function electionTotals(results: LokSabhaResults) {
  let electors = 0, polled = 0, candidates = 0;
  for (const seat of results.seats) {
    candidates += seat.candidates.length;
    if (seat.electors && seat.votesPolled !== null) { electors += seat.electors; polled += seat.votesPolled; }
  }
  const contested = results.seats.flatMap((seat) => {
    const winner = seatWinner(seat);
    return winner?.margin !== null && winner?.margin !== undefined ? [{ seat, margin: winner.margin }] : [];
  }).sort((a, b) => a.margin - b.margin);
  return { candidates, turnout: electors ? (polled / electors) * 100 : null, closest: contested[0] ?? null, widest: contested.at(-1) ?? null };
}

export function statesOf(results: LokSabhaResults) {
  const states = new Map<string, { state: string; stateSlug: string; seats: ResultSeat[] }>();
  for (const seat of results.seats) {
    const entry = states.get(seat.stateSlug) ?? { state: seat.state, stateSlug: seat.stateSlug, seats: [] };
    entry.seats.push(seat);
    states.set(seat.stateSlug, entry);
  }
  return [...states.values()].sort((a, b) => a.state.localeCompare(b.state));
}

export function ordinal(n: number) {
  const suffix = ["th", "st", "nd", "rd"];
  const lastTwo = n % 100;
  return n + (suffix[(lastTwo - 20) % 10] ?? suffix[lastTwo] ?? suffix[0]);
}
