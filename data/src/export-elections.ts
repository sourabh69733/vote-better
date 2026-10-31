import { rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

import { LocalBlobStore } from "./blob-store.js";
import { linkElections, type CalendarElection, type ResultSource } from "./elections/link.js";
import { assemblyTarget, buildAssemblyBundle, type PartyNames } from "./export-assembly.js";
import { loadReferences, publishPendingResults } from "./export-lok-sabha-2024.js";
import { ASSEMBLY_ELECTIONS, assemblyFiles } from "./normalize/eci-assembly-result.js";
import { linkSegments, type SegmentLink } from "./normalize/eci-assembly-segments.js";
import { readFile } from "node:fs/promises";
import { seatKey } from "./elections/link.js";
import { buildLokSabhaHistoryBundle, historyTarget, loadHistoryReferences } from "./export-lok-sabha-history.js";
import { ECI_HISTORY } from "./import-eci-history.js";
import { migrate } from "./migrate.js";
import { ECI_GE2024_DETAILED_RESULT_URL } from "./normalize/eci-ge2024-detailed-result.js";
import type { HistoryYear } from "./normalize/eci-history-detailed-result.js";
import { loadPublication } from "./publish.js";

// Newest first: seats in older elections are matched against the newest one.
export const RESULT_SOURCES: ResultSource[] = [
  { electionId: "lok-sabha-2024", url: ECI_GE2024_DETAILED_RESULT_URL },
  { electionId: "lok-sabha-2019", url: ECI_HISTORY[2019].detailed },
  { electionId: "lok-sabha-2014", url: ECI_HISTORY[2014].detailed },
];

const calendarFile = fileURLToPath(new URL("../../web/records/elections.ts", import.meta.url));

// The curated calendar lives with the site, which validates it on load. Read only what the database needs.
export async function loadCalendar(path = calendarFile): Promise<CalendarElection[]> {
  const module = await import(pathToFileURL(path).href) as { elections?: unknown };
  if (!Array.isArray(module.elections)) throw new Error("calendar file has no elections list");
  return module.elections.map((value: unknown) => {
    const { id, name, body } = value as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string" || (body !== "lok-sabha" && body !== "assembly" && body !== "bye-election")) {
      throw new Error(`calendar record is malformed: ${JSON.stringify(value).slice(0, 120)}`);
    }
    return { id, name, body };
  });
}

async function writeAtomic(target: string, value: unknown) {
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: "w" });
  await rename(temporary, target);
}

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const published: ResultSource[] = [RESULT_SOURCES[0]];
    for (const year of [2019, 2014] as HistoryYear[]) {
      const url = ECI_HISTORY[year].detailed;
      const fresh = await publishPendingResults(pool, url);
      const publication = await loadPublication(pool, url);
      if (!publication.facts.length) { process.stdout.write(`${year}: nothing published yet, skipped.\n`); continue; }
      const blobs = new LocalBlobStore(fileURLToPath(new URL(`../raw/eci-${year}/blobs/`, import.meta.url)));
      const bundle = buildLokSabhaHistoryBundle(publication, year, await loadHistoryReferences(pool, blobs, year));
      await writeAtomic(historyTarget(year), bundle);
      published.push({ electionId: `lok-sabha-${year}`, url });
      const candidates = bundle.seats.reduce((sum, seat) => sum + seat.candidates.length, 0);
      process.stdout.write(`${year}: ${bundle.seats.length} seats, ${candidates} candidates written, ${fresh} newly published, ${bundle.checks.winnerOnlySeats} winner-only, ${bundle.checks.overCountedSeats.length} noted.\n`);
    }
    // Full party names, from ECI's 2024 and 2019 party lists.
    const partyNames: PartyNames = new Map();
    const references2024 = await loadReferences(pool, new LocalBlobStore(fileURLToPath(new URL("../raw/eci-2024/blobs/", import.meta.url))));
    const lokSabha2024 = JSON.parse(await readFile(fileURLToPath(new URL("../../web/records/generated/lok-sabha-2024.json", import.meta.url)), "utf8")) as
      { seats: { state: string; sourceName: string; slug: string; name: string }[] };
    const parents: { state: string; links: SegmentLink[]; childKey: Map<number, string> }[] = [];
    const lists = [
      ...references2024.parties,
      ...(await loadHistoryReferences(pool, new LocalBlobStore(fileURLToPath(new URL("../raw/eci-2019/blobs/", import.meta.url))), 2019)).parties,
    ];
    for (const party of lists) if (!partyNames.has(party.abbreviation)) partyNames.set(party.abbreviation, { name: party.name, type: party.type });

    for (const election of Object.values(ASSEMBLY_ELECTIONS)) {
      const url = assemblyFiles(election).detailed;
      const fresh = await publishPendingResults(pool, url);
      const publication = await loadPublication(pool, url);
      if (!publication.facts.length) { process.stdout.write(`${election.id}: nothing published yet, skipped.\n`); continue; }
      const references = (await pool.query(`
        SELECT DISTINCT ON (src.url) src.document_type AS title, src.url, s.content_hash, s.captured_at FROM snapshot s JOIN source src ON src.id = s.source_id
        WHERE src.url = ANY($1) ORDER BY src.url, s.captured_at DESC`, [Object.values(assemblyFiles(election)).filter((file) => file !== url)])).rows
        .map((row) => ({ title: row.title, url: row.url, contentHash: row.content_hash, capturedAt: (row.captured_at as Date).toISOString() }));
      const bundle0 = buildAssemblyBundle(publication, election, partyNames, references, []).seats;
      const segments = linkSegments(election.state, references2024.segments,
        bundle0.map((seat) => ({ number: seat.number, sourceName: seat.sourceName, electors: seat.electors })),
        lokSabha2024.seats.filter((seat) => seat.state === election.state));
      parents.push({ state: election.state, links: segments, childKey: new Map(bundle0.map((seat) => [seat.number, seatKey(seat.state, seat.sourceName, "assembly-seat", seat.number)])) });
      const segmentRef = references2024.sources.find((source) => source.url.includes("15-Assembly"))!;
      const bundle = buildAssemblyBundle(publication, election, partyNames, [...references, segmentRef], segments);
      await writeAtomic(assemblyTarget(election.id), bundle);
      published.push({ electionId: election.id, url });
      const unnamed = Object.entries(bundle.parties).filter(([, party]) => party.type === "not listed").map(([code]) => code);
      process.stdout.write(`${election.id}: ${bundle.seats.length} seats, ${bundle.seats.reduce((sum, seat) => sum + seat.candidates.length, 0)} candidates written, ${fresh} newly published; parties without a full name: ${unnamed.join(", ") || "none"}.\n`);
    }

    const summary = await linkElections(pool, await loadCalendar(), published);
    for (const { state, links, childKey } of parents) {
      const updated = await pool.query(`
        UPDATE area child SET parent_id = parent.id
        FROM unnest($1::text[], $2::text[]) AS input(child_key, parent_key)
        JOIN area parent ON parent.stable_key = input.parent_key
        WHERE child.stable_key = input.child_key AND child.parent_id IS DISTINCT FROM parent.id`,
        [links.map((link) => childKey.get(link.assemblyNumber)!), links.map((link) => seatKey(state, link.parliament.sourceName))]);
      process.stdout.write(`${state}: ${links.length} assembly seats placed in Lok Sabha seats (${links.filter((l) => l.rule === "alias").length} by reviewed spelling, ${links.filter((l) => l.rule === "electors").length} by electors); ${updated.rowCount} links changed.\n`);
    }
    process.stdout.write(`Linked ${summary.elections} elections and ${summary.seats} seats: ${summary.byElection.map((e) => `${e.electionId} +${e.contests} contests +${e.candidacies} candidacies`).join("; ")}.\n`);
    if (summary.unmatched.length) process.stdout.write(`Seats with no 2024 match (kept separate): ${summary.unmatched.map((u) => `${u.electionId} ${u.seat}`).join(", ")}\n`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
