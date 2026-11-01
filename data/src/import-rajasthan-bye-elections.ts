import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { type BlobStore, openBlobStore } from "./blob-store.js";
import { migrate } from "./migrate.js";
import { checkTranscriptions, normalizeDeclaration, normalizeReturn, type Transcriptions } from "./normalize/rajasthan-form21e-transcription.js";
import { collectDocument, PDF_DOCUMENT } from "./sources/collect-document.js";
import { createLegacyTlsFetch } from "./sources/rajasthan-legacy-tls.js";
import { CivicStore } from "./store.js";

export const BYE_ELECTION_TRANSCRIPTIONS = fileURLToPath(new URL("../extractions/rajasthan-bye-elections-2024-2025.json", import.meta.url));

export interface ByeElectionImportResult {
  drafts: number;
  documents: { url: string; status: "drafts-saved" | "source-failed" | "needs-transcription"; reason?: string }[];
}

// Collects each scanned return, checks that it is the file that was transcribed, and saves the drafts.
export async function importRajasthanByeElections(store: CivicStore, blobs: BlobStore, input?: Transcriptions): Promise<ByeElectionImportResult> {
  const transcriptions = checkTranscriptions(input ?? JSON.parse(await readFile(BYE_ELECTION_TRANSCRIPTIONS, "utf8")));
  const items = [
    ...transcriptions.returns.map((item) => ({ item, title: "Form 21E", drafts: (at: string) => normalizeReturn(item, at) })),
    ...transcriptions.declarations.map((item) => ({ item, title: "Gazette declaration of result", drafts: (at: string) => normalizeDeclaration(item, at) })),
  ];
  const result: ByeElectionImportResult = { drafts: 0, documents: [] };
  const fetcher = createLegacyTlsFetch(items.map(({ item }) => item.sourceUrl), { maxBytes: 30_000_000, timeoutMs: 60_000 }) as typeof fetch;
  for (const { item, title, drafts } of items) {
    const source = await store.saveSource({ authority: "Chief Electoral Officer, Rajasthan", documentType: `${title}, ${item.constituency.number}-${item.constituency.name}, ${item.electionId}`, url: item.sourceUrl });
    const collected = await collectDocument(source, store, PDF_DOCUMENT, { blobStore: blobs, fetcher, timeoutMs: 60_000, maxBytes: 30_000_000, minIntervalMs: 1_500 });
    if (collected.status === "failed") { result.documents.push({ url: item.sourceUrl, status: "source-failed", reason: collected.reason }); continue; }
    if (collected.snapshot.contentHash !== `sha256:${item.snapshotSha256}`) {
      await store.recordCollectionAttempt({ sourceId: source.id, snapshotId: collected.snapshot.id, attemptedAt: new Date().toISOString(), outcome: "invalid", detail: "the file changed since it was transcribed" });
      result.documents.push({ url: item.sourceUrl, status: "needs-transcription", reason: "the file changed since it was transcribed" });
      continue;
    }
    const saved = await store.saveObservations(collected.snapshot.id, drafts(new Date().toISOString()));
    result.drafts += saved.length;
    result.documents.push({ url: item.sourceUrl, status: "drafts-saved" });
  }
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const blobs = openBlobStore("rajasthan-bye-elections/blobs/");
    const result = await importRajasthanByeElections(new CivicStore(pool), blobs);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.documents.some((document) => document.status !== "drafts-saved")) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
