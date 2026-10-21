import { rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { migrate } from "./migrate.js";
import { ECI_GE2024_DETAILED_RESULT_URL, slugify, type CandidateResult } from "./normalize/eci-ge2024-detailed-result.js";
import { loadPublication, publishApproved, type Publication } from "./publish.js";
import { LocalBlobStore, type BlobStore } from "./blob-store.js";
import { ECI_GE2024_REFERENCES, ECI_GE2024_SOURCE } from "./import-eci-2024.js";
import {
  crossCheckWinners, ECI_GE2024_PARTY_LIST_URL, ECI_GE2024_SURAT_URL, ECI_GE2024_WINNERS_URL,
  parsePartyList, parseSuccessfulCandidates, parseSuratSummary,
  type Party, type SeatSummary, type UnopposedSeat,
} from "./normalize/eci-ge2024-reference.js";

const target = fileURLToPath(new URL("../../web/records/generated/lok-sabha-2024.json", import.meta.url));

// ECI writes names in capitals. Keep the source text and add a readable form.
export function readableName(value: string): string {
  return value.toLowerCase().replace(/(^|[\s.(\-'"‘“/])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase());
}

export async function publishPendingResults(pool: pg.Pool, sourceUrl = ECI_GE2024_DETAILED_RESULT_URL): Promise<number> {
  const pending = await pool.query(`
    SELECT o.id FROM observation o
    JOIN snapshot s ON s.id = o.snapshot_id
    JOIN LATERAL (
      SELECT r.decision FROM review_observation ro JOIN review_event r ON r.id = ro.review_id
      WHERE ro.observation_id = o.id ORDER BY r.sequence DESC LIMIT 1
    ) rev ON rev.decision = 'approved'
    WHERE s.url = $1 AND o.predicate = 'candidate.result'
      AND NOT EXISTS (SELECT 1 FROM fact_observation fo WHERE fo.observation_id = o.id)
  `, [sourceUrl]);
  if (pending.rowCount) await publishApproved(pool, sourceUrl, pending.rows.map((row) => row.id));
  return pending.rowCount ?? 0;
}

export interface References {
  parties: Party[];
  winners: SeatSummary[];
  surat: UnopposedSeat;
  sources: { title: string; url: string; contentHash: string; capturedAt: string }[];
}

export async function loadReferences(pool: pg.Pool, blobs: BlobStore): Promise<References> {
  const sources: References["sources"] = [];
  const bytes = new Map<string, Buffer>();
  for (const reference of ECI_GE2024_REFERENCES) {
    const snapshot = await pool.query(`
      SELECT s.content_hash, s.captured_at, s.blob_ref FROM snapshot s JOIN source src ON src.id = s.source_id
      WHERE src.url = $1 AND s.blob_ref IS NOT NULL ORDER BY s.captured_at DESC, s.recorded_at DESC LIMIT 1
    `, [reference.url]);
    if (!snapshot.rowCount) throw new Error(`no saved snapshot for ${reference.documentType}; run import:eci-2024`);
    const row = snapshot.rows[0];
    bytes.set(reference.url, await blobs.get(row.blob_ref));
    sources.push({ title: reference.documentType, url: reference.url, contentHash: row.content_hash, capturedAt: (row.captured_at as Date).toISOString() });
  }
  return {
    parties: parsePartyList(bytes.get(ECI_GE2024_PARTY_LIST_URL)!),
    winners: parseSuccessfulCandidates(bytes.get(ECI_GE2024_WINNERS_URL)!),
    surat: parseSuratSummary(bytes.get(ECI_GE2024_SURAT_URL)!),
    sources,
  };
}

export function buildLokSabha2024Bundle(publication: Publication, references: References) {
  const latest = new Map<string, Publication["facts"][number]>();
  for (const fact of publication.facts) {
    if (fact.predicate === "candidate.result" && !latest.has(fact.subjectId)) latest.set(fact.subjectId, fact);
  }
  const facts = [...latest.values()];
  if (!facts.length) throw new Error("no published results to export");
  const hashes = new Set(facts.map((fact) => fact.source.contentHash));
  if (hashes.size !== 1) throw new Error("published results come from more than one snapshot; review before export");
  const first = facts[0].source;

  const results = facts.map((fact) => fact.value as CandidateResult);
  const { nameVariants } = crossCheckWinners(references.winners, results.map((value) => ({
    state: value.state, constituency: value.constituency, rank: value.rank, name: value.name,
    party: value.party, votes: value.votes.total, validVotes: value.contest.validVotes,
  })));
  const seatInfo = new Map(references.winners.map((seat) => [`${seat.state}|${seat.constituency}`.toLowerCase(), seat]));
  const partyNames = new Map(references.parties.map((party) => [party.abbreviation, party]));
  const usedParties = new Set(results.map((value) => value.party));

  const seats = new Map<string, ReturnType<typeof seatOf>>();
  function seatOf(value: CandidateResult) {
    const info = seatInfo.get(`${value.state}|${value.constituency}`.toLowerCase())!;
    return {
      state: value.state, stateSlug: slugify(value.state), number: info.number, reservation: info.reservation,
      name: readableName(value.constituency), sourceName: value.constituency, slug: slugify(value.constituency),
      unopposed: null as null | { winner: string; party: string; nominated: number; rejected: number; withdrawn: number },
      electors: value.contest.electors, votesPolled: value.contest.votesPolled,
      validVotes: value.contest.validVotes, notaVotes: value.contest.notaVotes,
      candidates: [] as {
        slug: string; name: string; sourceName: string; party: string; partySymbol: string | null;
        gender: CandidateResult["gender"]; age: number | null; category: string | null;
        votes: number; postalVotes: number; shareOfValidVotes: number; rank: number;
        factId: string; locator: string; reviewedAt: string;
      }[],
    };
  }
  for (const fact of facts) {
    const value = fact.value as CandidateResult;
    const key = `${value.state}\u0000${value.constituency}`;
    const seat = seats.get(key) ?? seatOf(value);
    seat.candidates.push({
      slug: value.personKey.split("/").at(-1)!, name: readableName(value.name), sourceName: value.name,
      party: value.party, partySymbol: value.partySymbol, gender: value.gender, age: value.age, category: value.category,
      votes: value.votes.total, postalVotes: value.votes.postal, shareOfValidVotes: value.shareOfValidVotes, rank: value.rank,
      factId: fact.id, locator: fact.source.locator, reviewedAt: fact.reviewedAt,
    });
    seats.set(key, seat);
  }
  const { surat } = references;
  const suratParty = [...partyNames.values()].find((party) => party.name === surat.winner.party);
  if (!suratParty) throw new Error("Surat winner's party is not in the party list");
  usedParties.add(suratParty.abbreviation);
  const unopposed = {
    state: surat.state, stateSlug: slugify(surat.state), number: surat.number, reservation: surat.reservation,
    name: readableName(surat.constituency), sourceName: surat.constituency, slug: slugify(surat.constituency),
    unopposed: { winner: readableName(surat.winner.name), party: suratParty.abbreviation, nominated: surat.nominated, rejected: surat.rejected, withdrawn: surat.withdrawn },
    electors: null, votesPolled: null, validVotes: null, notaVotes: null, candidates: [],
  };
  const ordered = [...[...seats.values()].map((seat) => ({ ...seat, candidates: seat.candidates.sort((a, b) => a.rank - b.rank) })), unopposed]
    .sort((a, b) => a.state.localeCompare(b.state) || a.number - b.number);
  return {
    election: { id: "lok-sabha-2024", name: "General Election to Lok Sabha, 2024", seats: ordered.length },
    parties: Object.fromEntries([...usedParties].sort().map((abbreviation) => {
      const party = partyNames.get(abbreviation);
      if (!party) throw new Error(`unknown party ${abbreviation}`);
      return [abbreviation, { name: party.name, type: party.type }];
    })),
    source: {
      authority: ECI_GE2024_SOURCE.authority, title: ECI_GE2024_SOURCE.documentType, url: first.url,
      contentHash: first.contentHash, capturedAt: first.capturedAt,
      note: "Report 33 covers 542 seats. Surat (Gujarat) was decided unopposed; its details come from ECI report 2A.",
      disclaimer: "ECI prepares these statistical reports from index cards for academic and research purposes. The statutory forms kept by Returning Officers are final.",
    },
    references: references.sources,
    checks: { winnersMatchReport4: true, runnerUpNameVariants: nameVariants },
    revisionId: publication.revisionId, publishedAt: publication.publishedAt,
    seats: ordered,
  };
}

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const published = await publishPendingResults(pool);
    const blobs = new LocalBlobStore(fileURLToPath(new URL("../raw/eci-2024/blobs/", import.meta.url)));
    const bundle = buildLokSabha2024Bundle(await loadPublication(pool, ECI_GE2024_DETAILED_RESULT_URL), await loadReferences(pool, blobs));
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${JSON.stringify(bundle)}\n`, { flag: "w" });
    await rename(temporary, target);
    const candidates = bundle.seats.reduce((sum, seat) => sum + seat.candidates.length, 0);
    process.stdout.write(`Lok Sabha 2024 written: ${bundle.seats.length} seats, ${candidates} candidates, ${published} newly published, ${bundle.checks.runnerUpNameVariants.length} runner-up name variant(s).\n`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
