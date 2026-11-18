import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { seatSlug } from "./elections/link.js";
import { readableName, type References } from "./export-lok-sabha-2024.js";
import type { PartyNames } from "./export-assembly.js";
import { slugify } from "./normalize/eci-ge2024-detailed-result.js";
import type { Publication } from "./publish.js";

// Writes each reviewed bye-election round in the shape the site reads for any election. Only approved
// facts are written; a round with nothing approved yet gets no file, so the site keeps showing it as pending.

export const byElectionTarget = (id: string) => fileURLToPath(new URL(`../../web/records/generated/${id}.json`, import.meta.url));

interface ByeResult {
  election: string; personKey: string; state: string; constituency: string; seatNumber: number; name: string; party: string; rank: number;
  declaredOnly?: boolean; votes: null | { total: number }; shareOfValidVotes?: number;
  contest: null | { electors: number; votesPolled: number; validVotes: number; notaVotes: number; candidates: number };
}

interface BaseSeat { number: number; slug: string; reservation: string; parliament: { slug: string; name: string } | null }

const plain = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Returns give full party names; the site keys parties by ECI's abbreviation where one is known.
export function partyCodeOf(names: PartyNames) {
  const byName = new Map([...names].map(([code, party]) => [plain(party.name), code]));
  return (name: string) => (plain(name) === "independent" ? "IND" : byName.get(plain(name)) ?? name);
}

export function buildByElectionBundle(
  electionId: string, electionName: string, publications: Publication[], partyNames: PartyNames, base: BaseSeat[],
  sources: References["sources"],
) {
  const facts = publications.flatMap((publication) => publication.facts.filter((fact) => fact.predicate === "candidate.result"));
  const latest = new Map<string, (typeof facts)[number]>();
  for (const fact of facts) if (!latest.has(fact.subjectId)) latest.set(fact.subjectId, fact);
  const values = [...latest.values()].filter((fact) => (fact.value as unknown as ByeResult).election === electionId);
  if (!values.length) return null;
  const codeOf = partyCodeOf(partyNames);
  const parties = new Map<string, { name: string; type: string }>();
  const party = (name: string) => {
    const code = codeOf(name);
    if (!parties.has(code)) parties.set(code, partyNames.get(code) ?? { name: code === "IND" ? "Independent" : name, type: "not listed" });
    return code;
  };
  const seats = new Map<number, ReturnType<typeof seatOf>>();
  function seatOf(value: ByeResult) {
    const known = base.find((seat) => seat.number === value.seatNumber);
    if (!known || known.slug !== seatSlug(value.constituency, value.seatNumber)) throw new Error(`${electionId}: seat ${value.seatNumber} ${value.constituency} does not match the assembly results`);
    return {
      state: value.state, stateSlug: slugify(value.state), number: value.seatNumber, reservation: known.reservation,
      name: readableName(value.constituency), sourceName: value.constituency, slug: known.slug,
      unopposed: null, winnerOnly: null as null | { winner: string; party: string; margin: null }, parliament: known.parliament,
      electors: value.contest?.electors ?? null, votesPolled: value.contest?.votesPolled ?? null,
      validVotes: value.contest?.validVotes ?? null, notaVotes: value.contest?.notaVotes ?? null,
      candidates: [] as { slug: string; name: string; sourceName: string; party: string; partySymbol: null; gender: null; age: null; category: null;
        votes: number; postalVotes: number; shareOfValidVotes: number; rank: number; factId: string; locator: string; reviewedAt: string }[],
    };
  }
  for (const fact of values) {
    const value = fact.value as unknown as ByeResult;
    const seat = seats.get(value.seatNumber) ?? seatOf(value);
    if (value.declaredOnly) seat.winnerOnly = { winner: value.name, party: party(value.party), margin: null };
    else seat.candidates.push({
      slug: value.personKey.split("/").at(-1)!, name: value.name, sourceName: value.name, party: party(value.party), partySymbol: null, gender: null, age: null, category: null,
      // Form 21E gives one total per candidate; postal votes are not split out.
      votes: value.votes!.total, postalVotes: 0, shareOfValidVotes: value.shareOfValidVotes ?? 0, rank: value.rank,
      factId: fact.id, locator: fact.source.locator, reviewedAt: fact.reviewedAt,
    });
    seats.set(value.seatNumber, seat);
  }
  const first = values[0].source;
  return {
    election: { id: electionId, name: electionName, seats: seats.size },
    parties: Object.fromEntries([...parties].sort(([a], [b]) => a.localeCompare(b))),
    source: {
      authority: "Chief Electoral Officer, Rajasthan", title: "Return of election (Form 21E), transcribed by hand and reviewed",
      url: first.url, contentHash: first.contentHash, capturedAt: first.capturedAt,
      note: "Transcribed from the scanned return and compared with it by a reviewer before publishing.",
      disclaimer: "Form 21E is the Returning Officer's statutory return of election.",
    },
    references: sources,
    checks: { winnersMatchReport4: true, runnerUpNameVariants: [] as string[] },
    revisionId: publications.at(-1)!.revisionId, publishedAt: publications.map((p) => p.publishedAt ?? "").sort().at(-1),
    seats: [...seats.values()].sort((a, b) => a.number - b.number).map((seat) => ({ ...seat, candidates: seat.candidates.sort((a, b) => a.rank - b.rank) })),
  };
}

export async function readBaseSeats(): Promise<BaseSeat[]> {
  const file = fileURLToPath(new URL("../../web/records/generated/rajasthan-assembly-2023.json", import.meta.url));
  return (JSON.parse(await readFile(file, "utf8")) as { seats: BaseSeat[] }).seats;
}
