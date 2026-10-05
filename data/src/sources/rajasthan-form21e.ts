import { createHash } from "node:crypto";

import type { BlobStore } from "../blob-store.js";
import type { Snapshot, Source } from "../contracts.js";
import { type CollectionOutcome, CivicStore } from "../store.js";

export const JAIPUR_FORM21E_URL =
  "https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-7.pdf";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface CollectionOptions {
  fetcher?: Fetcher;
  blobStore?: BlobStore;
  maxAttempts?: number;
  retryDelayMs?: number;
  minIntervalMs?: number;
  timeoutMs?: number;
  maxBytes?: number;
}

export type CollectionResult =
  | { status: "succeeded"; snapshot: Snapshot; attempts: number }
  | { status: "failed"; attempts: number; reason: string };

class SourceFailure extends Error {
  constructor(public readonly outcome: CollectionOutcome, message: string, public readonly httpStatus?: number) {
    super(message);
  }
}

const nextRequestByHost = new Map<string, number>();

async function pause(ms: number): Promise<void> {
  if (ms > 0) await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function rateLimit(url: string, minIntervalMs: number): Promise<void> {
  if (minIntervalMs <= 0) return;
  const host = new URL(url).host;
  const wait = Math.max(0, (nextRequestByHost.get(host) ?? 0) - Date.now());
  await pause(wait);
  nextRequestByHost.set(host, Date.now() + minIntervalMs);
}

async function pdfBytes(response: Response, sourceUrl: string, maxBytes: number): Promise<Buffer> {
  if (response.status !== 200) throw new SourceFailure("unavailable", `HTTP ${response.status}`, response.status);
  if (response.url && new URL(response.url).origin !== new URL(sourceUrl).origin) {
    throw new SourceFailure("invalid", "source redirected to another origin", response.status);
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/pdf") && !contentType.includes("application/octet-stream")) {
    throw new SourceFailure("invalid", "response is not a PDF", response.status);
  }
  const statedSize = Number(response.headers.get("content-length"));
  if (statedSize > maxBytes) throw new SourceFailure("invalid", "PDF exceeds size limit", response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new SourceFailure("invalid", "invalid PDF bytes", response.status);
  }
  return bytes;
}

export async function collectJaipurForm21E(
  source: Source, store: CivicStore, options: CollectionOptions = {},
): Promise<CollectionResult> {
  const fetcher = options.fetcher ?? fetch;
  const maxAttempts = options.maxAttempts ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 1_000;
  const minIntervalMs = options.minIntervalMs ?? 2_000;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxBytes = options.maxBytes ?? 10_000_000;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new Error("maxAttempts must be 1 to 3");
  let reason = "source unavailable";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await rateLimit(source.url, minIntervalMs);
    const attemptedAt = new Date().toISOString();
    let outcome: CollectionOutcome = "unavailable";
    let httpStatus: number | undefined;
    try {
      const response = await fetcher(source.url, {
        method: "GET", redirect: "follow", headers: { Accept: "application/pdf" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      httpStatus = response.status;
      const bytes = await pdfBytes(response, source.url, maxBytes);
      const contentHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      const blobRef = options.blobStore ? await options.blobStore.put(bytes) : undefined;
      const snapshot = await store.saveSnapshot(source.id, source.url, contentHash, new Date().toISOString(), blobRef);
      await store.recordCollectionAttempt({ sourceId: source.id, snapshotId: snapshot.id, attemptedAt, outcome: "succeeded", httpStatus });
      return { status: "succeeded", snapshot, attempts: attempt };
    } catch (error) {
      if (error instanceof SourceFailure) {
        outcome = error.outcome;
        httpStatus = error.httpStatus;
        reason = error.message;
      } else {
        outcome = "unavailable";
        reason = "network or storage error";
      }
      await store.recordCollectionAttempt({ sourceId: source.id, attemptedAt, outcome, httpStatus, detail: reason });
      if (attempt < maxAttempts) await pause(retryDelayMs);
    }
  }
  return { status: "failed", attempts: maxAttempts, reason };
}
