import { fileURLToPath } from "node:url";
import pg from "pg";

import type { BlobStore } from "./blob-store.js";
import { seatName } from "./elections/link.js";
import { readableName } from "./export-lok-sabha-2024.js";
import { ECI_HISTORY } from "./import-eci-history.js";
import { slugify } from "./normalize/eci-ge2024-detailed-result.js";
import { KNOWN_MISSING, type HistoryCandidateResult, type HistoryYear, type ParsedHistory } from "./normalize/eci-history-detailed-result.js";
import { crossCheckHistory, parseHistoryPartyList, parseHistoryWinners, resolveParty, type HistoryParty, type HistoryWinner } from "./normalize/eci-history-reference.js";
import type { Publication } from "./publish.js";

// Writes 2019 and 2014 Lok Sabha results in the same shape the site already reads for 2024.
// These reports have no seat numbers, so `number` is null; the 2014 file leaves out 32 seats,
// which appear with the winner and margin from ECI's winners list and no candidate rows.

export const historyTarget = (year: HistoryYear) => fileURLToPath(new URL(`../../web/records/generated/lok-sabha-${year}.json`, import.meta.url));

export interface HistoryReferences {
  parties: HistoryParty[];
  winners: HistoryWinner[];
  sources: { title: string; url: string; contentHash: string; capturedAt: string }[];
}

export async function loadHistoryReferences(pool: pg.Pool, blobs: BlobStore, year: HistoryYear): Promise<HistoryReferences> {
  const files = ECI_HISTORY[year];
  const read = async (url: string, title: string) => {
    const row = (await pool.query(`
      SELECT s.content_hash, s.captured_at, s.blob_ref FROM snapshot s JOIN source src ON src.id = s.source_id
      WHERE src.url = $1 AND s.blob_ref IS NOT NULL ORDER BY s.captured_at DESC, s.recorded_at DESC LIMIT 1
    `, [url])).rows[0];
    if (!row) throw new Error(`no saved snapshot for ${year} ${title}; run sync eci-ge${year}-results`);
    return { bytes: await blobs.get(row.blob_ref), source: { title: `GE ${year} statistical report, ${title}`, url, contentHash: row.content_hash, capturedAt: (row.captured_at as Date).toISOString() } };
  };
  const winners = await read(files.winners, "List of Successful Candidates");
  const parties = await read(files.parties, "List of Political Parties Participated");
  return { winners: parseHistoryWinners(winners.bytes), parties: parseHistoryPartyList(parties.bytes), sources: [winners.source, parties.source] };
}

const plain = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function buildLokSabhaHistoryBundle(publication: Publication, year: HistoryYear, references: HistoryReferences) {
  const latest = new Map<string, Publication["facts"][number]>();
  for (const fact of publication.facts) {
    if (fact.predicate === "candidate.result" && !latest.has(fact.subjectId)) latest.set(fact.subjectId, fact);
  }
  const facts = [...latest.values()];
  if (!facts.length) throw new Error(`no published ${year} results to export`);
  if (new Set(facts.map((fact) => fact.source.contentHash)).size !== 1) throw new Error(`${year} results come from more than one snapshot; review before export`);
  const first = facts[0].source;
  const results = facts.map((fact) => fact.value as HistoryCandidateResult);

  const parsed = { year, seats: 0, candidates: results.map((value) => ({ value })), notes: [] } as unknown as ParsedHistory;
  const { winnerOnly, nameVariants } = crossCheckHistory(year, parsed, references.winners, references.parties);
  const winnerOf = new Map(references.winners.map((winner) => [`${plain(winner.state)}|${plain(winner.constituency)}`, winner]));

  const parties = new Map<string, { name: string; type: string }>();
  const partyCode = (code: string, symbol: string | null) => {
    const resolved = resolveParty(references.parties, code, symbol);
    if (!parties.has(code)) parties.set(code, resolved ? { name: resolved.name, type: resolved.type } : { name: code, type: "not listed" });
    return code;
  };

  type Candidate = {
    slug: string; name: string; sourceName: string; party: string; partySymbol: string | null;
    gender: HistoryCandidateResult["gender"]; age: number | null; category: string | null;
    votes: number; postalVotes: number; shareOfValidVotes: number; rank: number;
    factId: string; locator: string; reviewedAt: string;
  };
  const seats = new Map<string, {
    state: string; stateSlug: string; number: null; reservation: string; name: string; sourceName: string; slug: string;
    unopposed: null; winnerOnly: null | { winner: string; party: string; margin: number };
    electors: number | null; votesPolled: number | null; validVotes: number | null; notaVotes: number | null; candidates: Candidate[];
  }>();
  for (const fact of facts) {
    const value = fact.value as HistoryCandidateResult;
    const key = `${value.state}\u0000${value.constituency}`;
    let seat = seats.get(key);
    if (!seat) {
      const winner = winnerOf.get(`${plain(value.state)}|${plain(value.constituency)}`);
      seat = {
        state: value.state, stateSlug: slugify(value.state), number: null, reservation: winner?.reservation ?? "GEN",
        name: readableName(seatName(value.constituency)), sourceName: value.constituency, slug: slugify(seatName(value.constituency)),
        unopposed: null, winnerOnly: null,
        electors: value.contest.electors, votesPolled: value.contest.votesPolled, validVotes: value.contest.validVotes, notaVotes: value.contest.notaVotes,
        candidates: [],
      };
      seats.set(key, seat);
    }
    seat.candidates.push({
      slug: value.personKey.split("/").at(-1)!, name: readableName(value.name), sourceName: value.name,
      party: partyCode(value.party, value.partySymbol), partySymbol: value.partySymbol, gender: value.gender, age: value.age, category: value.category,
      votes: value.votes.total, postalVotes: value.votes.postal, shareOfValidVotes: value.shareOfValidVotes, rank: value.rank,
      factId: fact.id, locator: fact.source.locator, reviewedAt: fact.reviewedAt,
    });
  }
  for (const winner of winnerOnly) {
    seats.set(`${winner.state}\u0000${winner.constituency}`, {
      state: winner.state, stateSlug: slugify(winner.state), number: null, reservation: winner.reservation,
      name: readableName(seatName(winner.constituency)), sourceName: winner.constituency, slug: slugify(seatName(winner.constituency)),
      unopposed: null, winnerOnly: { winner: readableName(winner.name), party: partyCode(winner.party, null), margin: winner.margin },
      electors: null, votesPolled: null, validVotes: null, notaVotes: null, candidates: [],
    });
  }
  const ordered = [...seats.values()]
    .map((seat) => ({ ...seat, candidates: seat.candidates.sort((a, b) => a.rank - b.rank) }))
    .sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
  const overCounted = ordered
    .filter((seat) => seat.votesPolled !== null && seat.candidates.reduce((sum, c) => sum + c.votes, 0) + (seat.notaVotes ?? 0) > seat.votesPolled)
    .map((seat) => `${seat.name}, ${seat.state}`);
  const missing = KNOWN_MISSING[year];

  return {
    election: { id: `lok-sabha-${year}`, name: `General Election to Lok Sabha, ${year}`, seats: ordered.length },
    parties: Object.fromEntries([...parties].sort(([a], [b]) => a.localeCompare(b))),
    source: {
      authority: "Election Commission of India", title: `GE ${year} statistical report, Constituency Wise Detailed Result`,
      url: first.url, contentHash: first.contentHash, capturedAt: first.capturedAt,
      note: missing.seats
        ? `ECI's detailed result file leaves out ${missing.seats} seats in ${missing.states.join(" and ")}. Those seats show only the winner and margin, from ECI's list of successful candidates.`
        : "Covers all 543 seats.",
      disclaimer: "ECI prepares these statistical reports from index cards. In case of dispute, the statutory forms kept by Returning Officers prevail. Vote share and valid votes are calculated from the report.",
    },
    references: references.sources,
    checks: { winnersMatchReport4: true, runnerUpNameVariants: nameVariants, winnerOnlySeats: winnerOnly.length, overCountedSeats: overCounted },
    revisionId: publication.revisionId, publishedAt: publication.publishedAt,
    seats: ordered,
  };
}
