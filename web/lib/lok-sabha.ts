import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Lok Sabha results for every election the site has published, in one shape:
// loading and validation, seat and candidate lookups, links, margins, search and formatting.

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

// For pages that cannot render without the file, such as the 2024 seat pages.
export function requireResults(id: ResultElectionId): LokSabhaResults {
  const results = loadResults(id);
  if (!results) throw new Error(`${id} results are not published; run the data export`);
  return results;
}

export const yearOf = (id: ResultElectionId) => Number(id.slice(-4));

// 2024 seats live under /seats, with a page per candidate; older seats under /elections.
export function seatHref(seat: Pick<ResultSeat, "stateSlug" | "slug">, id: ResultElectionId = "lok-sabha-2024") {
  return id === "lok-sabha-2024" ? `/seats/${seat.stateSlug}/${seat.slug}` : `/elections/${id}/${seat.stateSlug}/${seat.slug}`;
}

// Candidate pages exist for 2024 only.
export function candidateHref(seat: Pick<ResultSeat, "stateSlug" | "slug">, candidate: Pick<ResultCandidate, "slug">) {
  return `${seatHref(seat)}/${candidate.slug}`;
}

export function findSeat(id: ResultElectionId, stateSlug: string, seatSlug: string) {
  return loadResults(id)?.seats.find((seat) => seat.stateSlug === stateSlug && seat.slug === seatSlug);
}

export function findCandidate(id: ResultElectionId, stateSlug: string, seatSlug: string, candidateSlug: string) {
  const seat = findSeat(id, stateSlug, seatSlug);
  const candidate = seat?.candidates.find((item) => item.slug === candidateSlug);
  return seat && candidate ? { seat, candidate } : undefined;
}

export const formatNumber = (value: number) => value.toLocaleString("en-IN");

// Short Indian form for reading: 3,72,032 -> "3.72 lakh". Exact figures stay on the page.
export function formatShort(value: number) {
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");
  if (value >= 10_000_000) return `${trim(value / 10_000_000)} crore`;
  if (value >= 100_000) return `${trim(value / 100_000)} lakh`;
  return formatNumber(value);
}

export function marginOf(seat: ResultSeat, candidate: ResultCandidate) {
  const winner = seat.candidates[0];
  if (candidate.rank === 1) {
    const runnerUp = seat.candidates[1];
    return runnerUp ? { kind: "won" as const, votes: candidate.votes - runnerUp.votes, other: runnerUp } : null;
  }
  return { kind: "behind" as const, votes: winner.votes - candidate.votes, other: winner };
}

// One plain sentence built only from the published result.
export function summaryOf(seat: ResultSeat, candidate: ResultCandidate, partyName: (code: string) => string) {
  const margin = marginOf(seat, candidate);
  const share = `${Math.round(candidate.shareOfValidVotes)}% of valid votes`;
  const votes = `Got ${formatShort(candidate.votes)} votes (${share}) in ${seat.name}.`;
  if (!margin) return `${votes} Was the only candidate on the ballot.`;
  if (margin.kind === "won") {
    return `${votes} Won by ${formatShort(margin.votes)} votes over ${margin.other.name} (${partyName(margin.other.party)}).`;
  }
  return `${votes} Finished ${candidate.rank} of ${seat.candidates.length}, ${formatShort(margin.votes)} votes behind the winner, ${margin.other.name} (${partyName(margin.other.party)}).`;
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

// Where a seat's winning margin ranks among the contested seats in its state, widest first.
export function marginRank(seat: Pick<ResultSeat, "stateSlug" | "slug">, id: ResultElectionId = "lok-sabha-2024") {
  const results = loadResults(id);
  if (!results) return null;
  const margins = marginsInState(results, seat.stateSlug);
  const rank = margins.findIndex((row) => row.seat.slug === seat.slug) + 1;
  return rank ? { rank, total: margins.length } : null;
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

const plain = (value: string) => value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, " ").trim();

export interface SeatMatch {
  // The newest election this seat appears in, and that election's version of the seat.
  id: ResultElectionId;
  seat: ResultSeat;
  years: ResultElectionId[];
  // People whose name matched, in any election.
  people: { id: ResultElectionId; candidate: ResultCandidate }[];
  score: number;
}

// Search seats by seat or state name, or by the name of anyone who contested, across every published election.
export function searchSeats(query: string, limit = 60): SeatMatch[] {
  const words = plain(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const hits = new Map<string, { stateSlug: string; slug: string; people: SeatMatch["people"]; score: number }>();
  for (const id of RESULT_ELECTIONS) {
    for (const seat of loadResults(id)?.seats ?? []) {
      let score = 0;
      if (words.every((word) => plain(`${seat.name} ${seat.state}`).includes(word))) score = plain(seat.name).startsWith(words.join(" ")) ? 3 : 2;
      const people = seat.candidates.filter((candidate) => words.every((word) => plain(candidate.name).includes(word))).map((candidate) => ({ id, candidate }));
      if (people.length) score = Math.max(score, people.some((person) => person.candidate.rank === 1) ? 1.5 : 1);
      const winnerOnly = seat.unopposed ?? seat.winnerOnly;
      if (!score && winnerOnly && words.every((word) => plain(winnerOnly.winner).includes(word))) score = 1.5;
      if (!score) continue;
      const key = `${seat.stateSlug}/${seat.slug}`;
      const hit = hits.get(key) ?? { stateSlug: seat.stateSlug, slug: seat.slug, people: [], score: 0 };
      hit.people.push(...people);
      hit.score = Math.max(hit.score, score);
      hits.set(key, hit);
    }
  }
  return [...hits.values()].map((hit) => {
    const years = RESULT_ELECTIONS.filter((id) => findSeat(id, hit.stateSlug, hit.slug));
    return { id: years[0], seat: findSeat(years[0], hit.stateSlug, hit.slug)!, years, people: hit.people, score: hit.score };
  })
    .sort((a, b) => b.score - a.score || a.seat.name.localeCompare(b.seat.name))
    .slice(0, limit);
}
