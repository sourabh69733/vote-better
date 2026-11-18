import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { loadDraftProfile, type DraftProfile } from "./profile-draft.js";
import { loadProfileReview } from "./profile-review.js";
import type { SourceCheckIndex } from "./profile-source-check.js";

type Queryable = Pick<pg.Pool, "query">;
type Fact = DraftProfile["facts"][number];

export interface PublicMpProfile {
  memberId: number;
  name: string;
  party: string;
  constituency: string;
  state: string;
  membershipStatus: string;
  rosterSource: { url: string; contentHash: string; capturedAt: string };
  sourceCheckedAt: string;
  facts: Fact[];
}

const publicPredicates = new Set(["person.birthDate", "person.educationStatement", "person.profession",
  "person.photoUrl", "person.socialProfile", "office.positionsHeld"]);

export function publicFacts(facts: readonly Fact[]): Fact[] {
  return facts.filter((fact) => publicPredicates.has(fact.predicate));
}

export async function buildPublicMpProfiles(db: Queryable, checks: SourceCheckIndex): Promise<PublicMpProfile[]> {
  if (checks.schemaVersion !== 1 || checks.method !== "sansad-snapshot-replay-v1" ||
      !Array.isArray(checks.entries) || new Set(checks.entries.map((entry) => entry.memberId)).size !== checks.entries.length) {
    throw new Error("invalid source-check report");
  }
  const profiles: PublicMpProfile[] = [];
  for (const entry of checks.entries) {
    if (entry.status !== "checked" || !entry.checkedAt || !entry.token) continue;
    const report = await loadProfileReview(db, entry.memberId);
    if (report.token !== entry.token) throw new Error(`source check is stale for member ${entry.memberId}`);
    const draft = await loadDraftProfile(db, entry.memberId, entry);
    if (!draft.sourceCheck) throw new Error(`source check missing from draft ${entry.memberId}`);
    const rosterSource = report.sources.find((source) => source.url.startsWith("https://sansad.in/api_ls/member?"));
    if (!rosterSource) throw new Error(`roster source missing for member ${entry.memberId}`);
    const base = `membersDtoList[mpsno=${entry.memberId}]`;
    const roster = await db.query(`SELECT predicate, normalized_value FROM observation
      WHERE snapshot_id = $1 AND locator LIKE $2 AND normalizer_version = 'sansad-ls-members-v1'
        AND predicate = ANY($3::text[])`, [rosterSource.snapshotId, `${base}.%`,
      ["office.party", "office.constituency", "office.state", "office.membershipStatus"]]);
    const value = (predicate: string): string => {
      const matches = roster.rows.filter((row) => row.predicate === predicate);
      const found = matches[0]?.normalized_value;
      if (matches.length !== 1 || typeof found !== "string" || !found.trim()) {
        throw new Error(`invalid ${predicate} for member ${entry.memberId}`);
      }
      return found;
    };
    profiles.push({ memberId: entry.memberId, name: draft.personName,
      party: value("office.party"), constituency: value("office.constituency"), state: value("office.state"),
      membershipStatus: value("office.membershipStatus"),
      rosterSource: { url: rosterSource.url, contentHash: rosterSource.contentHash, capturedAt: rosterSource.capturedAt },
      sourceCheckedAt: entry.checkedAt, facts: publicFacts(draft.facts) });
  }
  return profiles.sort((a, b) => a.name.localeCompare(b.name, "en-IN") || a.memberId - b.memberId);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ??
    "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    if (process.argv.length !== 2) throw new Error("Usage: npm run export:local-mps");
    const path = fileURLToPath(new URL("../raw/profile-source-checks/index.json", import.meta.url));
    const checks = JSON.parse(await readFile(path, "utf8")) as SourceCheckIndex;
    const profiles = await buildPublicMpProfiles(pool, checks);
    if (!profiles.length) throw new Error("no source-checked profiles to export");
    const directory = fileURLToPath(new URL("../raw/public-profiles/", import.meta.url));
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const target = resolve(directory, "sansad-mps.json");
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(),
      sourceLabel: "Digital Sansad", profiles }, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, target);
    process.stdout.write(`${JSON.stringify({ exported: profiles.length, target })}\n`);
  } finally {
    await pool.end();
  }
}
