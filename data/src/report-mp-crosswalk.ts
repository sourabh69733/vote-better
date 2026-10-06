import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { buildMpCrosswalk, type BoundaryArea } from "./mp-crosswalk.js";
import { assembleSansadRoster, type SansadClaimRow } from "./sansad-roster.js";

const areaDraftPath = fileURLToPath(new URL("../raw/maps/pin_candidates_draft.json", import.meta.url));
const reportPath = fileURLToPath(new URL("../raw/maps/mp_crosswalk_draft.json", import.meta.url));

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

async function main(): Promise<void> {
  const draft = object(JSON.parse(await readFile(areaDraftPath, "utf8")), "PIN area draft");
  if (draft.schemaVersion !== 1 || draft.reviewStatus !== "unreviewed") throw new Error("unexpected PIN area draft");
  const areas = object(draft.areas, "PIN draft areas") as Record<string, BoundaryArea>;
  if (Object.keys(areas).length !== draft.areaCount) throw new Error("area count differs from PIN draft");
  const sources = object(draft.sources, "PIN draft sources");
  const areaSource = object(sources.areas, "boundary source");
  if (typeof areaSource.inputSha256 !== "string") throw new Error("boundary source hash is missing");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    const result = await pool.query(`
      SELECT o.snapshot_id, o.locator, o.predicate, o.normalized_value,
        s.url, s.content_hash, s.captured_at
      FROM observation o
      JOIN snapshot s ON s.id = o.snapshot_id
      JOIN source src ON src.id = s.source_id
      WHERE o.normalizer_version = 'sansad-ls-members-v1'
        AND src.authority = 'Parliament of India'
        AND o.predicate = ANY($1::text[])
      ORDER BY s.url, o.locator, o.predicate
    `, [["person.sansadMemberId", "person.name", "office.party", "office.state",
      "office.constituency", "office.membershipStatus"]]);
    const rows: SansadClaimRow[] = result.rows.map((row) => ({
      snapshotId: row.snapshot_id, url: row.url, contentHash: row.content_hash,
      capturedAt: (row.captured_at as Date).toISOString(), locator: row.locator,
      predicate: row.predicate, value: row.normalized_value,
    }));
    const roster = assembleSansadRoster(rows);
    const crosswalk = buildMpCrosswalk(areas, roster.members);
    const report = {
      schemaVersion: 1,
      reviewStatus: "unreviewed",
      generatedAt: new Date().toISOString(),
      boundarySource: areaSource,
      rosterSnapshots: roster.snapshots,
      counts: {
        areas: Object.keys(areas).length, members: roster.members.length,
        proposed: crosswalk.proposed.length, ambiguousAreas: crosswalk.ambiguousAreas.length,
        ambiguousMembers: crosswalk.ambiguousMembers.length,
        unmatchedAreas: crosswalk.unmatchedAreaIds.length, unmatchedMembers: crosswalk.unmatchedMemberIds.length,
      },
      areas,
      members: roster.members,
      ...crosswalk,
    };
    const temporary = `${reportPath}.tmp`;
    await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await rename(temporary, reportPath);
    process.stdout.write(`${JSON.stringify({ reportPath, ...report.counts })}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
