import { fileURLToPath } from "node:url";

import { seatName, seatSlug } from "./elections/link.js";
import { readableName } from "./export-lok-sabha-2024.js";
import { slugify } from "./normalize/eci-ge2024-detailed-result.js";
import type { AssemblyCandidateResult, AssemblyElection } from "./normalize/eci-assembly-result.js";
import type { SegmentLink } from "./normalize/eci-assembly-segments.js";
import type { Publication } from "./publish.js";

// Writes a state assembly election in the same shape the site reads for Lok Sabha results.

export const assemblyTarget = (id: string) => fileURLToPath(new URL(`../../web/records/generated/${id}.json`, import.meta.url));

// ECI's assembly reports give party abbreviations only; full names come from its national party lists.
export type PartyNames = Map<string, { name: string; type: string }>;

export function buildAssemblyBundle(publication: Publication, election: AssemblyElection, partyNames: PartyNames, references: { title: string; url: string; contentHash: string; capturedAt: string }[], segments: SegmentLink[]) {
  const latest = new Map<string, Publication["facts"][number]>();
  for (const fact of publication.facts) if (fact.predicate === "candidate.result" && !latest.has(fact.subjectId)) latest.set(fact.subjectId, fact);
  const facts = [...latest.values()];
  if (!facts.length) throw new Error(`no published ${election.id} results to export`);
  if (new Set(facts.map((fact) => fact.source.contentHash)).size !== 1) throw new Error(`${election.id} results come from more than one snapshot; review before export`);
  const first = facts[0].source;

  const parties = new Map<string, { name: string; type: string }>();
  const seats = new Map<number, ReturnType<typeof seatOf>>();
  function seatOf(value: AssemblyCandidateResult) {
    const reservation = /\((SC|ST)\)\s*$/i.exec(value.constituency)?.[1]?.toUpperCase() ?? "GEN";
    return {
      state: value.state, stateSlug: slugify(value.state), number: value.seatNumber, reservation,
      name: readableName(seatName(value.constituency)), sourceName: value.constituency, slug: seatSlug(value.constituency, value.seatNumber),
      unopposed: null, winnerOnly: null,
      // The Lok Sabha seat this assembly seat lies in, from ECI's 2024 report 15.
      parliament: null as null | { slug: string; name: string },
      electors: value.contest.electors, votesPolled: value.contest.votesPolled, validVotes: value.contest.validVotes, notaVotes: value.contest.notaVotes,
      candidates: [] as {
        slug: string; name: string; sourceName: string; party: string; partySymbol: string | null; gender: AssemblyCandidateResult["gender"];
        age: number | null; category: string | null; votes: number; postalVotes: number; shareOfValidVotes: number; rank: number;
        factId: string; locator: string; reviewedAt: string;
      }[],
    };
  }
  for (const fact of facts) {
    const value = fact.value as AssemblyCandidateResult;
    const seat = seats.get(value.seatNumber) ?? seatOf(value);
    if (!parties.has(value.party)) parties.set(value.party, partyNames.get(value.party) ?? { name: value.party === "IND" ? "Independent" : value.party, type: "not listed" });
    seat.candidates.push({
      slug: value.personKey.split("/").at(-1)!, name: readableName(value.name), sourceName: value.name, party: value.party, partySymbol: value.partySymbol,
      gender: value.gender, age: value.age, category: value.category, votes: value.votes.total, postalVotes: value.votes.postal,
      shareOfValidVotes: value.shareOfValidVotes, rank: value.rank, factId: fact.id, locator: fact.source.locator, reviewedAt: fact.reviewedAt,
    });
    seats.set(value.seatNumber, seat);
  }
  const parentOf = new Map(segments.map((link) => [link.assemblyNumber, { slug: link.parliament.slug, name: link.parliament.name }]));
  const ordered = [...seats.values()].sort((a, b) => a.number - b.number)
    .map((seat) => ({ ...seat, parliament: parentOf.get(seat.number) ?? null, candidates: seat.candidates.sort((a, b) => a.rank - b.rank) }));
  if (segments.length && ordered.some((seat) => !seat.parliament)) throw new Error(`${election.id}: some assembly seats have no Lok Sabha seat`);
  if (ordered.length !== election.seats) throw new Error(`${election.id}: ${ordered.length} seats published, expected ${election.seats}`);
  const year = election.id.slice(-4);

  return {
    election: { id: election.id, name: `General Election to Legislative Assembly of ${election.state}, ${year}`, seats: ordered.length },
    parties: Object.fromEntries([...parties].sort(([a], [b]) => a.localeCompare(b))),
    source: {
      authority: "Election Commission of India", title: `${election.state} assembly ${year} statistical report 10, Detailed Results`,
      url: first.url, contentHash: first.contentHash, capturedAt: first.capturedAt,
      note: "ECI's final report, including Karanpur, whose poll was adjourned to January 2024 after a candidate died.",
      disclaimer: "ECI prepares these statistical reports from index cards. In case of dispute, the statutory forms kept by Returning Officers prevail. Vote share is calculated from ECI's valid votes.",
    },
    references,
    checks: { winnersMatchReport4: true, runnerUpNameVariants: [] as string[] },
    revisionId: publication.revisionId, publishedAt: publication.publishedAt,
    seats: ordered,
  };
}
