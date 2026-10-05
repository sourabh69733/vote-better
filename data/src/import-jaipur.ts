import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { migrate } from "./migrate.js";
import { normalizeJaipurForm21E } from "./normalize/rajasthan-form21e.js";
import { collectJaipurForm21E, JAIPUR_FORM21E_URL, type CollectionOptions } from "./sources/rajasthan-form21e.js";
import { fetchJaipurLegacyTls } from "./sources/rajasthan-legacy-tls.js";
import { CivicStore } from "./store.js";

export { JAIPUR_FORM21E_URL };

export interface JaipurImportOptions extends CollectionOptions {
  sourceUrl?: string;
  transcription?: unknown;
}

export type JaipurImportResult =
  | { status: "drafts-saved"; snapshotId: string; observationIds: string[] }
  | { status: "source-failed"; reason: string }
  | { status: "needs-transcription"; snapshotId: string; reason: string };

export async function importJaipurForm21E(store: CivicStore, options: JaipurImportOptions = {}): Promise<JaipurImportResult> {
  const sourceUrl = options.sourceUrl ?? JAIPUR_FORM21E_URL;
  const source = await store.saveSource({
    authority: "Rajasthan Chief Electoral Officer", documentType: "Form 21E", url: sourceUrl,
  });
  const fetcher = options.fetcher ?? (sourceUrl === JAIPUR_FORM21E_URL ? fetchJaipurLegacyTls : undefined);
  const collection = await collectJaipurForm21E(source, store, { ...options, fetcher });
  if (collection.status === "failed") return { status: "source-failed", reason: collection.reason };
  const snapshot = collection.snapshot;
  const input = options.transcription ?? JSON.parse(await readFile(
    new URL("../extractions/jaipur-form21e-2024.json", import.meta.url), "utf8",
  )) as unknown;
  let drafts;
  try {
    drafts = normalizeJaipurForm21E(snapshot, input, new Date().toISOString());
  } catch {
    await store.recordCollectionAttempt({
      sourceId: source.id, snapshotId: snapshot.id, attemptedAt: new Date().toISOString(),
      outcome: "invalid", detail: "captured PDF needs a matching checked transcription",
    });
    return {
      status: "needs-transcription", snapshotId: snapshot.id,
      reason: "PDF hash changed or transcription is inconsistent",
    };
  }
  const observations = await store.saveObservations(snapshot.id, drafts);
  return { status: "drafts-saved", snapshotId: snapshot.id, observationIds: observations.map((item) => item.id) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better",
  });
  try {
    await migrate(pool);
    const result = await importJaipurForm21E(new CivicStore(pool));
    process.stdout.write(`${JSON.stringify(result.status === "drafts-saved"
      ? { status: result.status, snapshotId: result.snapshotId, draftCount: result.observationIds.length }
      : result)}\n`);
    if (result.status !== "drafts-saved") process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
