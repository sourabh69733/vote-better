import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { migrate } from "./migrate.js";
import { parseSansadMembersPage } from "./normalize/sansad-members.js";
import { CivicStore, type ObservationDraft } from "./store.js";

type ImportStore = Pick<CivicStore, "saveSource" | "saveSnapshot" | "recordCollectionAttempt" | "saveObservations">;
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface SansadImportOptions {
  fetcher?: Fetcher;
  pageSize?: number;
  minIntervalMs?: number;
  timeoutMs?: number;
}

export type SansadImportResult =
  | { status: "drafts-saved"; pages: number; members: number; drafts: number }
  | { status: "source-failed"; reason: string };

const BASE_URL = "https://sansad.in/api_ls/member";

function pageUrl(page: number, pageSize: number): string {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries({ loksabha: "18", state: "", party: "", gender: "", ageFrom: "", ageTo: "",
    noOfTerms: "", page: String(page), size: String(pageSize), searchText: "", constituency: "", sitting: "1",
    locale: "en", month: "", profession: "", otherProfession: "", constituencyCategory: "", positionCode: "",
    qualification: "", noOfChildren: "", isFreedomFighter: "", memberStatus: "s" })) url.searchParams.set(key, value);
  return url.toString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown source error";
}

export async function importSansadMembers(store: ImportStore, options: SansadImportOptions = {}): Promise<SansadImportResult> {
  const fetcher = options.fetcher ?? fetch;
  const pageSize = options.pageSize ?? 100;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error("pageSize must be 1 to 100");
  const minIntervalMs = options.minIntervalMs ?? 2_000;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const collected: { snapshotId: string; drafts: ObservationDraft[] }[] = [];
  const memberIds = new Set<number>();
  let expectedPages: number | undefined;
  let expectedMembers: number | undefined;
  let lastRequestAt = 0;

  for (let page = 1; page <= (expectedPages ?? 1); page += 1) {
    const url = pageUrl(page, pageSize);
    const source = await store.saveSource({ authority: "Parliament of India", documentType: "Lok Sabha member list JSON",
      url });
    const wait = Math.max(0, lastRequestAt + minIntervalMs - Date.now());
    if (wait) await new Promise<void>((done) => setTimeout(done, wait));
    lastRequestAt = Date.now();
    const attemptedAt = new Date().toISOString();
    let httpStatus: number | undefined;
    try {
      const response = await fetcher(url, { headers: { Accept: "application/json", Referer: "https://sansad.in/ls/members" },
        signal: AbortSignal.timeout(timeoutMs) });
      httpStatus = response.status;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (response.url && new URL(response.url).origin !== new URL(BASE_URL).origin) throw new Error("redirected to another origin");
      if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("response is not JSON");
      if (Number(response.headers.get("content-length")) > 2_000_000) throw new Error("JSON response exceeds size limit");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 2_000_000) throw new Error("JSON response exceeds size limit");
      const body: unknown = JSON.parse(bytes.toString("utf8"));
      const snapshot = await store.saveSnapshot(source.id, url, `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
        new Date().toISOString());
      const parsed = parseSansadMembersPage(snapshot, body, new Date().toISOString());
      if (parsed.page !== page) throw new Error("response page differs from requested page");
      if (expectedPages === undefined) {
        expectedPages = parsed.totalPages;
        expectedMembers = parsed.totalElements;
        if (expectedPages > 20 || expectedMembers > 2_000) throw new Error("unexpected member count");
      } else if (parsed.totalPages !== expectedPages || parsed.totalElements !== expectedMembers) {
        throw new Error("pagination changed during collection");
      }
      if (page < expectedPages && parsed.memberIds.length !== pageSize) throw new Error("incomplete member page");
      for (const id of parsed.memberIds) {
        if (memberIds.has(id)) throw new Error(`member ID repeated across pages: ${id}`);
        memberIds.add(id);
      }
      collected.push({ snapshotId: snapshot.id, drafts: parsed.drafts });
      await store.recordCollectionAttempt({ sourceId: source.id, snapshotId: snapshot.id, attemptedAt,
        outcome: "succeeded", httpStatus });
    } catch (error) {
      const reason = errorMessage(error);
      await store.recordCollectionAttempt({ sourceId: source.id, attemptedAt,
        outcome: httpStatus === 200 ? "invalid" : "unavailable", httpStatus, detail: reason });
      return { status: "source-failed", reason: `page ${page}: ${reason}` };
    }
  }
  if (memberIds.size !== expectedMembers) return { status: "source-failed", reason: "page totals do not match unique member IDs" };
  let drafts = 0;
  for (const item of collected) {
    await store.saveObservations(item.snapshotId, item.drafts);
    drafts += item.drafts.length;
  }
  return { status: "drafts-saved", pages: collected.length, members: memberIds.size, drafts };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const result = await importSansadMembers(new CivicStore(pool));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.status !== "drafts-saved") process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
