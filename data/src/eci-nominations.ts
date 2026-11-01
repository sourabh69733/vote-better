import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import type { BlobStore } from "./blob-store.js";
import { readableName } from "./export-lok-sabha-2024.js";
import { slugify } from "./normalize/eci-ge2024-detailed-result.js";
import { parseNominationPage, parseSeatOptions, seatCandidates, type NominationCard, type NominationCounts, type SeatCandidate } from "./normalize/eci-nominations.js";

// Candidate lists during a poll, from ECI's candidate affidavit portal. Returning officers enter
// each nomination as it is filed, then mark it accepted, rejected or withdrawn; the portal also
// lists the final contesting candidates in ballot order. One file per election in the calendar.

export const PORTAL = "https://affidavit.eci.gov.in";

export interface NominationTarget {
  // The election's id in the site calendar (web/records/elections.ts), and a short name for the source list.
  electionId: string;
  title: string;
  // The portal's first drop-down, e.g. "34-AC-BYE-4-63".
  electionType: string;
  // The portal's second drop-down, one per kind of seat, with the ECI state codes that vote.
  contests: { election: string; states: string[]; phases?: number }[];
}

export interface NominationSeat {
  kind: "assembly" | "lok-sabha";
  state: string;
  stateSlug: string;
  number: number;
  name: string;
  sourceName: string;
  slug: string;
  sourceUrl: string;
  papers: Omit<NominationCounts, "contesting">;
  candidates: SeatCandidate[];
}

export interface NominationPublication {
  schemaVersion: 1;
  electionId: string;
  // The day the lists last changed on this site; the About page shows when they were last checked.
  changedOn: string;
  source: { title: string; publisher: string; url: string; disclaimer: string };
  seats: NominationSeat[];
}

// Add an election here once ECI announces it and the portal lists it. Codes come from the portal's drop-downs.
export const NOMINATION_TARGETS: NominationTarget[] = [
  {
    electionId: "bye-elections-october-2026",
    title: "bye-elections, October 2026",
    electionType: "34-AC-BYE-4-63",
    contests: [
      { election: "34-AC-BYE-4-63", states: ["S22", "U07", "S25"] },
      { election: "34-PC-BYE-2-64", states: ["S03"] },
    ],
  },
];

export type Fetcher = (url: string) => Promise<string>;

// "34-PC-BYE-2-64": election number, seat kind, election kind, a portal type code, the portal's database id.
function codes(election: string) {
  const [number, kind, type, , database] = election.split("-");
  if (!number || (kind !== "AC" && kind !== "PC") || !type || !database) throw new Error(`unexpected portal election code ${election}`);
  return { number, kind, type, database };
}

export function seatListUrl(target: NominationTarget, election: string, state: string, number: number, phase: number, status: "" | "100", page = 1) {
  const query = new URLSearchParams({ electionType: target.electionType, election, states: state, phase: String(phase), constId: String(number) });
  if (status) query.set("submitName", status);
  if (page > 1) query.set("page", String(page));
  return `${PORTAL}/CandidateCustomFilter?${query}`;
}

// Every page of one list. The portal pages ten cards at a time and repeats its counters on each page.
async function readList(fetchPage: Fetcher, url: (page: number) => string, expected: (counts: NominationCounts) => number) {
  const cards: NominationCard[] = [];
  let counts: NominationCounts | undefined;
  for (let page = 1; page <= 100; page++) {
    const parsed = parseNominationPage(await fetchPage(url(page)));
    if (counts && !isDeepStrictEqual(counts, parsed.counts)) throw new Error("the list changed while it was being read; try again");
    counts = parsed.counts;
    cards.push(...parsed.cards);
    if (!parsed.cards.length || cards.length >= expected(counts)) break;
  }
  if (cards.length !== expected(counts!)) throw new Error(`read ${cards.length} cards from ${url(1)}, the portal counts ${expected(counts!)}`);
  return { cards, counts: counts! };
}

export async function collectSeat(fetchPage: Fetcher, target: NominationTarget, election: string, state: string, seat: { number: number; name: string }, phase: number): Promise<NominationSeat> {
  const all = await readList(fetchPage, (page) => seatListUrl(target, election, state, seat.number, phase, "", page), (counts) => counts.all);
  const contesting = await readList(fetchPage, (page) => seatListUrl(target, election, state, seat.number, phase, "100", page), (counts) => counts.contesting);
  const cards = [...all.cards, ...contesting.cards];
  const stray = cards.find((card) => card.constituency.toUpperCase() !== seat.name.toUpperCase() || card.state !== cards[0].state);
  if (stray) throw new Error(`seat ${seat.number} ${seat.name} lists a card for ${stray.constituency}, ${stray.state}`);
  const stateName = cards[0]?.state;
  if (!stateName) throw new Error(`seat ${seat.number} ${seat.name} has no nominations yet`);
  const name = readableName(seat.name);
  const { contesting: _contesting, ...papers } = all.counts;
  return {
    kind: codes(election).kind === "PC" ? "lok-sabha" : "assembly",
    state: stateName, stateSlug: slugify(stateName), number: seat.number, name, sourceName: seat.name, slug: slugify(name),
    sourceUrl: seatListUrl(target, election, state, seat.number, phase, ""),
    papers,
    candidates: seatCandidates(all.cards, contesting.cards, readableName),
  };
}

export async function collectNominations(fetchPage: Fetcher, target: NominationTarget): Promise<NominationSeat[]> {
  const seats: NominationSeat[] = [];
  for (const contest of target.contests) {
    const { number, kind, type, database } = codes(contest.election);
    for (const state of contest.states) {
      const before = seats.length;
      for (let phase = 1; phase <= (contest.phases ?? 1); phase++) {
        const options = parseSeatOptions(await fetchPage(`${PORTAL}/allConstList/${state}/${number}/${kind}/${database}/${type}/${phase}`));
        for (const option of options) seats.push(await collectSeat(fetchPage, target, contest.election, state, option, phase));
      }
      if (seats.length === before) throw new Error(`${contest.election} lists no seats for ${state}`);
    }
  }
  const keys = new Set<string>();
  for (const seat of seats) {
    const key = `${seat.stateSlug}/${seat.slug}`;
    if (keys.has(key)) throw new Error(`two seats share the address ${key}`);
    keys.add(key);
  }
  return seats.sort((a, b) => a.state.localeCompare(b.state) || a.kind.localeCompare(b.kind) || a.number - b.number);
}

export function buildPublication(target: NominationTarget, seats: NominationSeat[], today: string): NominationPublication {
  return {
    schemaVersion: 1,
    electionId: target.electionId,
    changedOn: today,
    source: {
      title: "Candidate affidavit portal", publisher: "Election Commission of India", url: `${PORTAL}/`,
      disclaimer: "ECI publishes this list as returning officers enter it and calls it tentative; the returning officer's list is final.",
    },
    seats,
  };
}

const outputDirectory = fileURLToPath(new URL("../../web/records/imported/nominations/", import.meta.url));
export const nominationFile = (electionId: string, directory = outputDirectory) => path.join(directory, `${electionId}.json`);

// Writes the election's file unless only the day would change, so an unchanged list opens no pull request.
export async function writePublication(publication: NominationPublication, directory = outputDirectory): Promise<boolean> {
  const file = nominationFile(publication.electionId, directory);
  const existing = await readFile(file, "utf8").then((text) => JSON.parse(text) as NominationPublication, () => null);
  if (existing && isDeepStrictEqual({ ...existing, changedOn: null }, { ...publication, changedOn: null })) return false;
  await mkdir(directory, { recursive: true });
  await writeFile(`${file}.tmp`, `${JSON.stringify(publication, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
  return true;
}

// Fetches politely, keeps every page in the blob store and retries a failed request twice.
export function portalFetcher(blobs: BlobStore, request: typeof fetch = fetch, pauseMs = 300): Fetcher {
  return async (url) => {
    for (let attempt = 1; ; attempt++) {
      try {
        await new Promise((done) => setTimeout(done, pauseMs));
        const response = await request(url, { headers: { "User-Agent": "VoteBetter/0.1 (public civic research)" }, signal: AbortSignal.timeout(45_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
        const body = Buffer.from(await response.arrayBuffer());
        await blobs.put(body);
        return body.toString("utf8");
      } catch (error) {
        if (attempt === 3) throw error;
        await new Promise((done) => setTimeout(done, 2000 * attempt));
      }
    }
  };
}
