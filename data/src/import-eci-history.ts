import type { BlobStore } from "./blob-store.js";
import { XLS_DOCUMENT } from "./normalize/eci-ge2024-detailed-result.js";
import { XLSX_DOCUMENT } from "./normalize/eci-ge2024-reference.js";
import { normalizeEciHistoryDetailedResult, parseEciHistoryDetailedResult, type HistoryYear } from "./normalize/eci-history-detailed-result.js";
import { crossCheckHistory, parseHistoryPartyList, parseHistoryWinners } from "./normalize/eci-history-reference.js";
import { collectDocument, type DocumentKind } from "./sources/collect-document.js";
import { OLD_ECI_HOST, oldEciFetcher } from "./sources/old-eci.js";
import type { CivicStore } from "./store.js";

const page = (path: string) => `${OLD_ECI_HOST}/files/file/${path}/`;

export const ECI_HISTORY: Record<HistoryYear, { kind: DocumentKind; extension: RegExp; detailed: string; winners: string; parties: string }> = {
  2019: {
    kind: XLS_DOCUMENT, extension: /\.xls$/i,
    detailed: page("13539-33-constituency-wise-detailed-result"),
    winners: page("13597-4-list-of-successful-candidate"),
    parties: page("13599-3-list-of-political-parties-participated"),
  },
  2014: {
    kind: XLSX_DOCUMENT, extension: /\.xlsx$/i,
    detailed: page("2785-constituency-wise-detailed-result"),
    winners: page("2843-list-of-successful-candidates"),
    parties: page("2844-list-of-political-parties-participated"),
  },
};

export type HistoryImportResult =
  | { status: "drafts-saved"; seats: number; observationIds: string[]; winnerOnly: number; notes: number }
  | { status: "source-failed" | "invalid-report"; reason: string };

export async function importEciHistory(store: CivicStore, blobs: BlobStore, year: HistoryYear, options: { countdownMs?: number; request?: typeof fetch } = {}): Promise<HistoryImportResult> {
  const files = ECI_HISTORY[year];
  const fetcher = oldEciFetcher({ extension: files.extension, countdownMs: options.countdownMs, request: options.request });
  const bytes: Partial<Record<"detailed" | "winners" | "parties", Buffer>> = {};
  let detailedSnapshot: { id: string; sourceId: string } | undefined;
  for (const [part, title] of [["detailed", "Constituency Wise Detailed Result"], ["winners", "List of Successful Candidates"], ["parties", "List of Political Parties Participated"]] as const) {
    const source = await store.saveSource({ authority: "Election Commission of India", documentType: `GE ${year} statistical report, ${title}`, url: files[part] });
    const collected = await collectDocument(source, store, files.kind, { fetcher, blobStore: blobs, timeoutMs: 120_000, maxBytes: 20_000_000, minIntervalMs: 3_000 });
    if (collected.status === "failed") return { status: "source-failed", reason: `${part}: ${collected.reason}` };
    bytes[part] = await blobs.get(collected.snapshot.blobRef!);
    if (part === "detailed") detailedSnapshot = { id: collected.snapshot.id, sourceId: source.id };
  }
  try {
    const report = parseEciHistoryDetailedResult(bytes.detailed!, year);
    const check = crossCheckHistory(year, report, parseHistoryWinners(bytes.winners!), parseHistoryPartyList(bytes.parties!));
    const observations = await store.saveObservations(detailedSnapshot!.id, normalizeEciHistoryDetailedResult(report, new Date().toISOString()));
    return { status: "drafts-saved", seats: report.seats, observationIds: observations.map((item) => item.id), winnerOnly: check.winnerOnly.length, notes: report.notes.length };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await store.recordCollectionAttempt({
      sourceId: detailedSnapshot!.sourceId, snapshotId: detailedSnapshot!.id, attemptedAt: new Date().toISOString(), outcome: "invalid", detail: reason,
    });
    return { status: "invalid-report", reason };
  }
}
