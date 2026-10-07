import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { LocalBlobStore, type BlobStore } from "./blob-store.js";
import { normalizeSansadBiography, normalizeSansadPositions } from "./normalize/sansad-biography.js";
import { listCollectedBiographyIds } from "./profile-draft.js";
import { loadProfileReview, type ProfileReviewReport } from "./profile-review.js";
import type { Snapshot } from "./contracts.js";
import type { ObservationDraft } from "./store.js";

type Queryable = Pick<pg.Pool, "query">;

export interface SourceCheckEntry {
  memberId: number;
  name?: string;
  token?: string;
  status: "checked" | "exception";
  checkedAt?: string;
  reasons: string[];
}

export interface SourceCheckIndex {
  schemaVersion: 1;
  method: "sansad-snapshot-replay-v1";
  generatedAt: string;
  entries: SourceCheckEntry[];
}

export function compareSourceDrafts(report: ProfileReviewReport, drafts: readonly ObservationDraft[], sourceUrl: string): string[] {
  const expected = report.observations.filter((item) => item.sourceUrl === sourceUrl);
  const key = (item: { predicate: string; locator: string }) => `${item.predicate}\u0000${item.locator}`;
  const saved = new Map(expected.map((item) => [key(item), item.value]));
  const replayed = new Map(drafts.map((item) => [key(item), item.normalizedValue]));
  const reasons: string[] = [];
  for (const [field, value] of saved) {
    if (!replayed.has(field)) reasons.push(`missing in source replay: ${field.replace("\u0000", " / ")}`);
    else if (JSON.stringify(value) !== JSON.stringify(replayed.get(field))) {
      reasons.push(`changed normalization: ${field.replace("\u0000", " / ")}`);
    }
  }
  for (const field of replayed.keys()) {
    if (!saved.has(field)) reasons.push(`missing saved observation: ${field.replace("\u0000", " / ")}`);
  }
  return reasons;
}

export async function checkProfileSource(db: Queryable, blobs: BlobStore, memberId: number): Promise<SourceCheckEntry> {
  try {
    const report = await loadProfileReview(db, memberId);
    const reasons: string[] = [];
    for (const kind of ["biography", "positions"] as const) {
      const url = kind === "biography"
        ? `https://sansad.in/api_ls/member/${memberId}?locale=en`
        : `https://sansad.in/api_ls/member/positionHeld?mpCode=${memberId}&locale=en`;
      const source = report.sources.find((item) => item.url === url);
      if (!source) { reasons.push(`${kind} source missing`); continue; }
      const result = await db.query("SELECT * FROM snapshot WHERE id = $1", [source.snapshotId]);
      const row = result.rows[0];
      if (!row?.blob_ref) { reasons.push(`${kind} source bytes missing`); continue; }
      try {
        const bytes = await blobs.get(row.blob_ref);
        const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
        if (hash !== source.contentHash) { reasons.push(`${kind} source hash mismatch`); continue; }
        const snapshot: Snapshot = {
          id: row.id, sourceId: row.source_id, url: row.url, contentHash: row.content_hash,
          capturedAt: new Date(row.captured_at).toISOString(), recordedAt: new Date(row.recorded_at).toISOString(),
          blobRef: row.blob_ref,
        };
        const body: unknown = JSON.parse(bytes.toString("utf8"));
        const drafts = kind === "biography"
          ? normalizeSansadBiography(snapshot, body, memberId, new Date().toISOString())
          : normalizeSansadPositions(snapshot, body, memberId, new Date().toISOString());
        reasons.push(...compareSourceDrafts(report, drafts, url));
      } catch (error) {
        reasons.push(`${kind} replay failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return { memberId, name: report.name, token: report.token,
      status: reasons.length ? "exception" : "checked",
      ...(reasons.length ? {} : { checkedAt: new Date().toISOString() }), reasons };
  } catch (error) {
    return { memberId, status: "exception", reasons: [error instanceof Error ? error.message : String(error)] };
  }
}

export async function checkAllProfiles(db: Queryable, blobs: BlobStore): Promise<SourceCheckIndex> {
  const ids = await listCollectedBiographyIds(db);
  const entries: SourceCheckEntry[] = [];
  for (const id of ids) entries.push(await checkProfileSource(db, blobs, id));
  return { schemaVersion: 1, method: "sansad-snapshot-replay-v1",
    generatedAt: new Date().toISOString(), entries };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const save = process.argv[2] === "--save";
  if (process.argv.length > (save ? 3 : 2)) throw new Error("Usage: npm run profile:source-check -- [--save]");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    const blobs = new LocalBlobStore(fileURLToPath(new URL("../raw/sansad-biography/", import.meta.url)));
    const index = await checkAllProfiles(pool, blobs);
    if (save) {
      const directory = fileURLToPath(new URL("../raw/profile-source-checks/", import.meta.url));
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const target = resolve(directory, "index.json");
      const temporary = `${target}.tmp`;
      await writeFile(temporary, `${JSON.stringify(index, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, target);
    }
    process.stdout.write(`${JSON.stringify({ checked: index.entries.filter((item) => item.status === "checked").length,
      exceptions: index.entries.filter((item) => item.status === "exception"), saved: save })}\n`);
  } finally {
    await pool.end();
  }
}
