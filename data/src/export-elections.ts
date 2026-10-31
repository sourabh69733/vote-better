import { rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

import { LocalBlobStore } from "./blob-store.js";
import { linkElections, type CalendarElection, type ResultSource } from "./elections/link.js";
import { publishPendingResults } from "./export-lok-sabha-2024.js";
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
    const summary = await linkElections(pool, await loadCalendar(), published);
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
