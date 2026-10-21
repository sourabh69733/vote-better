import { rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { migrate } from "./migrate.js";
import { ECI_GE2024_DETAILED_RESULT_URL, slugify, type CandidateResult } from "./normalize/eci-ge2024-detailed-result.js";
import { loadPublication, publishApproved, type Publication } from "./publish.js";
import { ECI_GE2024_SOURCE } from "./import-eci-2024.js";

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

export function buildLokSabha2024Bundle(publication: Publication) {
  const latest = new Map<string, Publication["facts"][number]>();
  for (const fact of publication.facts) {
    if (fact.predicate === "candidate.result" && !latest.has(fact.subjectId)) latest.set(fact.subjectId, fact);
  }
  const facts = [...latest.values()];
  if (!facts.length) throw new Error("no published results to export");
  const hashes = new Set(facts.map((fact) => fact.source.contentHash));
  if (hashes.size !== 1) throw new Error("published results come from more than one snapshot; review before export");
  const first = facts[0].source;

  const seats = new Map<string, ReturnType<typeof seatOf>>();
  function seatOf(value: CandidateResult) {
    return {
      state: value.state, stateSlug: slugify(value.state),
      name: readableName(value.constituency), sourceName: value.constituency, slug: slugify(value.constituency),
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
  const ordered = [...seats.values()]
    .map((seat) => ({ ...seat, candidates: seat.candidates.sort((a, b) => a.rank - b.rank) }))
    .sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
  return {
    election: { id: "lok-sabha-2024", name: "General Election to Lok Sabha, 2024", seatsInReport: ordered.length },
    source: {
      authority: ECI_GE2024_SOURCE.authority, title: ECI_GE2024_SOURCE.documentType, url: first.url,
      contentHash: first.contentHash, capturedAt: first.capturedAt,
      note: "Covers 542 of 543 seats. Surat (Gujarat) was decided unopposed and is reported separately by ECI.",
      disclaimer: "ECI prepares these statistical reports from index cards for academic and research purposes. The statutory forms kept by Returning Officers are final.",
    },
    revisionId: publication.revisionId, publishedAt: publication.publishedAt,
    seats: ordered,
  };
}

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const published = await publishPendingResults(pool);
    const bundle = buildLokSabha2024Bundle(await loadPublication(pool, ECI_GE2024_DETAILED_RESULT_URL));
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${JSON.stringify(bundle)}\n`, { flag: "w" });
    await rename(temporary, target);
    const candidates = bundle.seats.reduce((sum, seat) => sum + seat.candidates.length, 0);
    process.stdout.write(`Lok Sabha 2024 written: ${bundle.seats.length} seats, ${candidates} candidates, ${published} newly published.\n`);
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
