import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { loadProfileReview } from "./profile-review.js";

export interface PreviewFact {
  predicate: string;
  value: unknown;
  reviewedAt: string;
  source: { url: string; contentHash: string; capturedAt: string; locator: string };
}

export interface ProfilePreview {
  schemaVersion: 1;
  access: "local-review-preview";
  memberId: number;
  personKey: string | null;
  personName: string;
  reviewStatus: "unreviewed" | "partial" | "complete";
  generatedAt: string;
  facts: PreviewFact[];
}

export async function loadProfilePreview(pool: pg.Pool, memberId: number): Promise<ProfilePreview> {
  const report = await loadProfileReview(pool, memberId);
  const result = await pool.query(`
    SELECT o.id, p.stable_key, p.display_name, em.status AS match_status,
      r.decision, r.reviewed_at
    FROM observation o
    LEFT JOIN LATERAL (
      SELECT entity_id, status FROM entity_match WHERE observation_id = o.id
      ORDER BY sequence DESC LIMIT 1
    ) em ON true
    LEFT JOIN person p ON p.id = em.entity_id
    LEFT JOIN LATERAL (
      SELECT rev.decision, rev.reviewed_at FROM review_observation ro
      JOIN review_event rev ON rev.id = ro.review_id
      WHERE ro.observation_id = o.id ORDER BY rev.sequence DESC LIMIT 1
    ) r ON true
    WHERE o.id = ANY($1::uuid[])
  `, [report.observations.map((item) => item.id)]);
  const byId = new Map(result.rows.map((row) => [row.id as string, row]));
  const approved = report.observations.filter((item) => {
    const row = byId.get(item.id);
    return row?.match_status === "confirmed" && row.decision === "approved" && row.stable_key;
  });
  const people = new Set(approved.map((item) => byId.get(item.id).stable_key as string));
  if (people.size > 1) throw new Error("reviewed facts link to different people");
  const personKey = people.values().next().value ?? null;
  const personName = approved.length ? byId.get(approved[0].id).display_name as string : report.name;
  const facts: PreviewFact[] = approved.map((item) => {
    const source = report.sources.find((entry) => entry.snapshotId === item.snapshotId);
    if (!source) throw new Error("approved observation has no source snapshot");
    return { predicate: item.predicate, value: item.value,
      reviewedAt: (byId.get(item.id).reviewed_at as Date).toISOString(),
      source: { url: source.url, contentHash: source.contentHash,
        capturedAt: source.capturedAt, locator: item.locator } };
  });
  return { schemaVersion: 1, access: "local-review-preview", memberId, personKey, personName,
    reviewStatus: facts.length === 0 ? "unreviewed" : facts.length === report.observations.length ? "complete" : "partial",
    generatedAt: new Date().toISOString(), facts };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const memberId = Number(process.argv[2]);
  if (!process.argv[2] || !Number.isSafeInteger(memberId) || memberId < 1) {
    process.stderr.write("Usage: npm run profile:preview -- <Sansad member ID>\n");
    process.exitCode = 1;
  } else {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
      "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
    try {
      const preview = await loadProfilePreview(pool, memberId);
      const directory = fileURLToPath(new URL("../raw/profile-previews/", import.meta.url));
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const target = resolve(directory, `${memberId}.json`);
      const temporary = `${target}.tmp`;
      await writeFile(temporary, `${JSON.stringify(preview, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, target);
      process.stdout.write(`${JSON.stringify({ target, reviewStatus: preview.reviewStatus,
        facts: preview.facts.length })}\n`);
    } finally {
      await pool.end();
    }
  }
}
