import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { LocalBlobStore, type BlobStore } from "./blob-store.js";
import { migrate } from "./migrate.js";
import { normalizeSansadBiography, normalizeSansadPositions } from "./normalize/sansad-biography.js";
import { CivicStore, type CollectionOutcome, type ObservationDraft } from "./store.js";

type ImportStore = Pick<CivicStore, "saveSource" | "saveSnapshot" | "recordCollectionAttempt" | "saveObservations">;
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface BiographyImportOptions {
  blobStore: BlobStore;
  fetcher?: Fetcher;
  minIntervalMs?: number;
  timeoutMs?: number;
  maxBytes?: number;
}

export type BiographyImportResult =
  | { status: "drafts-saved"; memberId: number; drafts: number }
  | { status: "source-failed"; memberId: number; reason: string };

const base = "https://sansad.in/api_ls/member";

function sourceUrls(memberId: number): readonly string[] {
  return [`${base}/${memberId}?locale=en`, `${base}/positionHeld?mpCode=${memberId}&locale=en`];
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "unknown source error";
}

export async function importSansadBiography(
  store: ImportStore, memberId: number, options: BiographyImportOptions,
): Promise<BiographyImportResult> {
  if (!Number.isSafeInteger(memberId) || memberId < 1) throw new Error("memberId must be a positive integer");
  if (!options.blobStore) throw new Error("blobStore is required");
  const fetcher = options.fetcher ?? fetch;
  const minIntervalMs = options.minIntervalMs ?? 2_000;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxBytes = options.maxBytes ?? 1_000_000;
  if (minIntervalMs < 0 || timeoutMs < 1 || maxBytes < 1) throw new Error("invalid collection limits");
  const collected: { snapshotId: string; drafts: ObservationDraft[] }[] = [];
  let lastRequestAt = 0;

  for (const [index, url] of sourceUrls(memberId).entries()) {
    const source = await store.saveSource({ authority: "Parliament of India",
      documentType: index === 0 ? "Lok Sabha member biography JSON" : "Lok Sabha member positions JSON", url });
    const wait = Math.max(0, lastRequestAt + minIntervalMs - Date.now());
    if (wait) await new Promise<void>((done) => setTimeout(done, wait));
    lastRequestAt = Date.now();
    const attemptedAt = new Date().toISOString();
    let httpStatus: number | undefined;
    let outcome: CollectionOutcome = "unavailable";
    try {
      const response = await fetcher(url, { headers: { Accept: "application/json", Referer: `https://sansad.in/ls/members/biography/${memberId}` },
        signal: AbortSignal.timeout(timeoutMs) });
      httpStatus = response.status;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      outcome = "invalid";
      if (response.url && new URL(response.url).origin !== "https://sansad.in") throw new Error("redirected outside Sansad");
      if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("response is not JSON");
      if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("JSON response exceeds size limit");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > maxBytes) throw new Error("JSON response exceeds size limit");
      const body: unknown = JSON.parse(bytes.toString("utf8"));
      const capturedAt = new Date().toISOString();
      const blobRef = await options.blobStore.put(bytes);
      const snapshot = await store.saveSnapshot(source.id, url,
        `sha256:${createHash("sha256").update(bytes).digest("hex")}`, capturedAt, blobRef);
      const normalizedAt = new Date().toISOString();
      const drafts = index === 0
        ? normalizeSansadBiography(snapshot, body, memberId, normalizedAt)
        : normalizeSansadPositions(snapshot, body, memberId, normalizedAt);
      collected.push({ snapshotId: snapshot.id, drafts });
      await store.recordCollectionAttempt({ sourceId: source.id, snapshotId: snapshot.id, attemptedAt,
        outcome: "succeeded", httpStatus });
    } catch (error) {
      const reason = errorText(error);
      await store.recordCollectionAttempt({ sourceId: source.id, attemptedAt, outcome, httpStatus, detail: reason });
      return { status: "source-failed", memberId, reason: `${index === 0 ? "biography" : "positions"}: ${reason}` };
    }
  }

  for (const item of collected) await store.saveObservations(item.snapshotId, item.drafts);
  return { status: "drafts-saved", memberId, drafts: collected.reduce((count, item) => count + item.drafts.length, 0) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const memberArg = process.argv[2];
  if (!memberArg || !/^\d+$/.test(memberArg)) {
    process.stderr.write("Usage: npm run import:sansad-biography -- <Sansad member ID>\n");
    process.exitCode = 1;
  } else {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
      "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
    try {
      await migrate(pool);
      const blobStore = new LocalBlobStore(fileURLToPath(new URL("../raw/sansad-biography", import.meta.url)));
      const result = await importSansadBiography(new CivicStore(pool), Number(memberArg), { blobStore });
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (result.status !== "drafts-saved") process.exitCode = 1;
    } finally {
      await pool.end();
    }
  }
}
