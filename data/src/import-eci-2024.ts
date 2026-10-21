import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { type BlobStore, LocalBlobStore } from "./blob-store.js";
import { migrate } from "./migrate.js";
import {
  ECI_GE2024_DETAILED_RESULT_URL, normalizeEciGe2024DetailedResult, parseEciGe2024DetailedResult, XLS_DOCUMENT,
} from "./normalize/eci-ge2024-detailed-result.js";
import { collectDocument, type CollectionOptions } from "./sources/collect-document.js";
import { CivicStore } from "./store.js";

export const ECI_GE2024_SOURCE = {
  authority: "Election Commission of India",
  documentType: "GE 2024 statistical report 33, Constituency Wise Detailed Result",
  url: ECI_GE2024_DETAILED_RESULT_URL,
};

export type EciImportResult =
  | { status: "drafts-saved"; snapshotId: string; seats: number; observationIds: string[] }
  | { status: "source-failed"; reason: string }
  | { status: "invalid-report"; snapshotId: string; reason: string };

export async function importEciGe2024(
  store: CivicStore, blobs: BlobStore, options: CollectionOptions & { expectedSeats?: number } = {},
): Promise<EciImportResult> {
  const source = await store.saveSource(ECI_GE2024_SOURCE);
  const collection = await collectDocument(source, store, XLS_DOCUMENT, { ...options, blobStore: blobs, maxBytes: 20_000_000, timeoutMs: 60_000 });
  if (collection.status === "failed") return { status: "source-failed", reason: collection.reason };
  const { snapshot } = collection;
  let drafts;
  let seats;
  try {
    const report = parseEciGe2024DetailedResult(await blobs.get(snapshot.blobRef!), options.expectedSeats);
    seats = report.seats;
    drafts = normalizeEciGe2024DetailedResult(report, new Date().toISOString());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await store.recordCollectionAttempt({
      sourceId: source.id, snapshotId: snapshot.id, attemptedAt: new Date().toISOString(), outcome: "invalid", detail: reason,
    });
    return { status: "invalid-report", snapshotId: snapshot.id, reason };
  }
  const observations = await store.saveObservations(snapshot.id, drafts);
  return { status: "drafts-saved", snapshotId: snapshot.id, seats, observationIds: observations.map((item) => item.id) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better",
  });
  try {
    await migrate(pool);
    const blobs = new LocalBlobStore(fileURLToPath(new URL("../raw/eci-2024/blobs/", import.meta.url)));
    const result = await importEciGe2024(new CivicStore(pool), blobs);
    process.stdout.write(`${JSON.stringify(result.status === "drafts-saved"
      ? { status: result.status, snapshotId: result.snapshotId, seats: result.seats, draftCount: result.observationIds.length }
      : result)}\n`);
    if (result.status !== "drafts-saved") process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
