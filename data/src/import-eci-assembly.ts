import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { type BlobStore, LocalBlobStore } from "./blob-store.js";
import { migrate } from "./migrate.js";
import {
  ASSEMBLY_ELECTIONS, assemblyFiles, crossCheckAssembly, normalizeAssemblyResult,
  parseAssemblyDetailedResult, parseAssemblyVoters, parseAssemblyWinners, parsePartyWins,
} from "./normalize/eci-assembly-result.js";
import { XLSX_DOCUMENT } from "./normalize/eci-ge2024-reference.js";
import { collectDocument } from "./sources/collect-document.js";
import { CivicStore } from "./store.js";

const TITLES = {
  detailed: "10 - Detailed Results",
  winners: "2 - List of Successful Candidates",
  voters: "12 - AC Wise Voters Information",
  parties: "5 - Performance of Political Parties",
} as const;

export type AssemblyImportResult =
  | { status: "drafts-saved"; seats: number; observationIds: string[]; nameVariants: number }
  | { status: "source-failed" | "invalid-report"; reason: string };

// Collects the four reports, checks them against each other, and saves one draft per candidate.
export async function importEciAssembly(store: CivicStore, blobs: BlobStore, electionId: string): Promise<AssemblyImportResult> {
  const election = ASSEMBLY_ELECTIONS[electionId];
  if (!election) throw new Error(`unknown assembly election ${electionId}`);
  const files = assemblyFiles(election);
  const bytes: Partial<Record<keyof typeof files, Buffer>> = {};
  let detailed: { snapshotId: string; sourceId: string } | undefined;
  for (const part of Object.keys(files) as (keyof typeof files)[]) {
    const source = await store.saveSource({ authority: "Election Commission of India", documentType: `${election.state} assembly ${electionId.slice(-4)} statistical report ${TITLES[part]}`, url: files[part] });
    const collected = await collectDocument(source, store, XLSX_DOCUMENT, { blobStore: blobs, timeoutMs: 60_000, maxBytes: 10_000_000, minIntervalMs: 2_000 });
    if (collected.status === "failed") return { status: "source-failed", reason: `${part}: ${collected.reason}` };
    bytes[part] = await blobs.get(collected.snapshot.blobRef!);
    if (part === "detailed") detailed = { snapshotId: collected.snapshot.id, sourceId: source.id };
  }
  try {
    const report = parseAssemblyDetailedResult(bytes.detailed!, election);
    const turnout = parseAssemblyVoters(bytes.voters!);
    const check = crossCheckAssembly(report, parseAssemblyWinners(bytes.winners!), turnout, parsePartyWins(bytes.parties!));
    const observations = await store.saveObservations(detailed!.snapshotId, normalizeAssemblyResult(report, turnout, election, new Date().toISOString()));
    return { status: "drafts-saved", seats: report.seats.length, observationIds: observations.map((item) => item.id), nameVariants: check.nameVariants.length };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await store.recordCollectionAttempt({ sourceId: detailed!.sourceId, snapshotId: detailed!.snapshotId, attemptedAt: new Date().toISOString(), outcome: "invalid", detail: reason });
    return { status: "invalid-report", reason };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [electionId = "rajasthan-assembly-2023"] = process.argv.slice(2);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const blobs = new LocalBlobStore(fileURLToPath(new URL(`../raw/${electionId}/blobs/`, import.meta.url)));
    const result = await importEciAssembly(new CivicStore(pool), blobs, electionId);
    process.stdout.write(`${JSON.stringify(result.status === "drafts-saved" ? { ...result, observationIds: result.observationIds.length } : result)}\n`);
    if (result.status !== "drafts-saved") process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
