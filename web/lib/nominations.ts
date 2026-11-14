import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Candidate lists during a poll, collected from ECI's candidate affidavit portal by the
// eci-nominations-* sources in data/src/registry.ts. One file per election.

export type CandidateStatus = "contesting" | "accepted" | "filed" | "withdrawn" | "rejected";

export interface NominationCandidate {
  name: string;
  sourceName: string;
  party: string;
  status: CandidateStatus;
  ballot: number | null;
  nominations: number;
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
  papers: { all: number; accepted: number; rejected: number; withdrawn: number };
  candidates: NominationCandidate[];
}

export interface Nominations {
  schemaVersion: 1;
  electionId: string;
  changedOn: string;
  source: { title: string; publisher: string; url: string; disclaimer: string };
  seats: NominationSeat[];
}

// What each status means, in the words a first-time voter would use.
export const CANDIDATE_STATUS: Record<CandidateStatus, { label: string; meaning: string }> = {
  contesting: { label: "On the ballot", meaning: "Nomination accepted and not withdrawn. Their name will be on the voting machine." },
  accepted: { label: "Accepted", meaning: "Nomination passed scrutiny. They can still withdraw before the deadline." },
  filed: { label: "Filed", meaning: "Nomination filed. The returning officer has not checked it yet." },
  withdrawn: { label: "Withdrew", meaning: "Pulled out before the withdrawal deadline. Not on the ballot." },
  rejected: { label: "Rejected", meaning: "Every nomination paper was rejected at scrutiny. Not on the ballot." },
};

const STATUSES = Object.keys(CANDIDATE_STATUS);
const directory = () => join(process.cwd(), "records", "imported", "nominations");

export function validateNominations(value: unknown, electionId: string): asserts value is Nominations {
  const data = value as Nominations;
  if (data?.schemaVersion !== 1 || data.electionId !== electionId) throw new Error(`nominations file is not for ${electionId}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.changedOn) || !data.source?.url.startsWith("https://")) throw new Error(`${electionId} nominations need a day and a source`);
  const addresses = new Set<string>();
  for (const seat of data.seats) {
    const key = `${seat.stateSlug}/${seat.slug}`;
    if (addresses.has(key)) throw new Error(`${electionId} lists ${key} twice`);
    addresses.add(key);
    if (!seat.sourceUrl.startsWith("https://")) throw new Error(`${electionId} ${key} has no source link`);
    const ballots = seat.candidates.filter((candidate) => candidate.status === "contesting").map((candidate) => candidate.ballot);
    if (ballots.some((ballot, index) => ballot !== index + 1)) throw new Error(`${electionId} ${key} ballot numbers are not 1 to ${ballots.length}`);
    for (const candidate of seat.candidates) {
      if (!STATUSES.includes(candidate.status) || !candidate.name || !candidate.party) throw new Error(`${electionId} ${key} has a malformed candidate`);
    }
  }
}

const cache = new Map<string, Nominations | null>();

// Undefined when no candidate list has been collected for the election.
export function loadNominations(electionId: string): Nominations | undefined {
  if (!cache.has(electionId)) {
    const file = join(directory(), `${electionId}.json`);
    if (!/^[a-z0-9-]+$/.test(electionId) || !existsSync(file)) cache.set(electionId, null);
    else {
      const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
      validateNominations(parsed, electionId);
      cache.set(electionId, parsed);
    }
  }
  return cache.get(electionId) ?? undefined;
}

export function nominationElectionIds(): string[] {
  if (!existsSync(directory())) return [];
  return readdirSync(directory()).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)).sort();
}

export function findNominationSeat(electionId: string, stateSlug: string, slug: string) {
  return loadNominations(electionId)?.seats.find((seat) => seat.stateSlug === stateSlug && seat.slug === slug);
}

export const nominationSeatHref = (electionId: string, seat: Pick<NominationSeat, "stateSlug" | "slug">) => `/elections/${electionId}/${seat.stateSlug}/${seat.slug}`;

export function contestingCount(seat: NominationSeat) {
  return seat.candidates.filter((candidate) => candidate.status === "contesting").length;
}

// Candidates grouped the way the page shows them: the ballot first, then those still waiting, then those out.
export function candidateGroups(seat: NominationSeat) {
  const by = (...statuses: CandidateStatus[]) => seat.candidates.filter((candidate) => statuses.includes(candidate.status));
  return { ballot: by("contesting"), pending: by("accepted", "filed"), out: by("withdrawn", "rejected") };
}
