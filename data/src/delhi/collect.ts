import { createHash } from "node:crypto";
import type { BlobStore } from "../blob-store.js";
import type { ObservationDraft } from "../store.js";
import { CivicStore, type CollectionOutcome } from "../store.js";
import { delhiSources } from "./source-catalog.js";
import { normalizeGnctd } from "./normalize/gnctd.js";
import { normalizeAssembly } from "./normalize/assembly.js";
import { normalizePolice } from "./normalize/police.js";
import { normalizeMinisters } from "./normalize/ministers.js";
import { normalizeMps } from "./normalize/mps.js";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
interface Options { fetcher?: Fetcher; minIntervalMs?: number; timeoutMs?: number; maxBytes?: number }
export interface DelhiCollectionResult { outcome: CollectionOutcome; snapshotId?: string; drafts: number; detail?: string }

const parsers: Record<string, (html: string, at: string) => ObservationDraft[]> = {
  "gnctd-services-officers": normalizeGnctd,
  "delhi-assembly-secretariat": normalizeAssembly,
  "delhi-police-contacts": normalizePolice,
  "gnctd-ministers": normalizeMinisters,
  "gnctd-mps": normalizeMps,
};
const nextRequestByHost = new Map<string, number>();

export async function collectDelhiSource(sourceId: string, store: CivicStore, blobs: BlobStore, options: Options = {}): Promise<DelhiCollectionResult> {
  const definition = delhiSources.find((source) => source.id === sourceId);
  if (!definition) throw new Error(`unknown Delhi source: ${sourceId}`);
  if (definition.reuseStatus === "link-only") throw new Error("link-only source cannot be collected");
  const parser = parsers[sourceId];
  if (!parser || definition.documentType !== "html") throw new Error(`no reviewed parser for ${sourceId}`);
  const source = await store.saveSource({ authority: definition.authority, url: definition.url, documentType: definition.documentType });
  const interval = options.minIntervalMs ?? 60_000 / definition.maxRequestsPerMinute;
  const host = new URL(definition.url).host;
  const delay = Math.max(0, (nextRequestByHost.get(host) ?? 0) - Date.now());
  if (delay) await new Promise<void>((done) => setTimeout(done, delay));
  nextRequestByHost.set(host, Date.now() + interval);
  const attemptedAt = new Date().toISOString();
  let httpStatus: number | undefined;
  let snapshotId: string | undefined;
  try {
    const response = await (options.fetcher ?? fetch)(definition.url, { headers: { Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(options.timeoutMs ?? 15_000) });
    httpStatus = response.status;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (response.url && new URL(response.url).origin !== new URL(definition.url).origin) throw new Error("redirected to another origin");
    if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) throw new Error("response is not HTML");
    const maxBytes = options.maxBytes ?? 2_000_000;
    if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("response too large");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxBytes) throw new Error("response too large");
    const capturedAt = new Date().toISOString();
    const blobRef = await blobs.put(bytes);
    const snapshot = await store.saveSnapshot(source.id, definition.url, `sha256:${createHash("sha256").update(bytes).digest("hex")}`, capturedAt, blobRef);
    snapshotId = snapshot.id;
    const drafts = parser(bytes.toString("utf8"), capturedAt);
    if (drafts.some((draft) => !definition.allowedPredicates.includes(draft.predicate as never))) throw new Error("parser emitted unaudited predicate");
    await store.saveObservations(snapshot.id, drafts);
    await store.recordCollectionAttempt({ sourceId: source.id, snapshotId, attemptedAt, outcome: "succeeded", httpStatus });
    return { outcome: "succeeded", snapshotId, drafts: drafts.length };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown collection error";
    const outcome: CollectionOutcome = httpStatus === 200 ? "invalid" : "unavailable";
    await store.recordCollectionAttempt({ sourceId: source.id, snapshotId, attemptedAt, outcome, httpStatus, detail });
    return { outcome, snapshotId, drafts: 0, detail };
  }
}
