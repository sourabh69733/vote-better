import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getPublicMp, listPublicMps } from "./public-mps";

test("local MP preview reads a private export and rejects invalid records", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-mps-"));
  const file = join(directory, "profiles.json");
  const profile = { memberId: 5619, name: "Manju Sharma", party: "BJP", constituency: "Jaipur",
    state: "Rajasthan", membershipStatus: "Sitting", sourceCheckedAt: "2026-10-07T00:00:00.000Z",
    rosterSource: { url: "https://sansad.in/api_ls/member?page=1", contentHash: `sha256:${"a".repeat(64)}`,
      capturedAt: "2026-10-06T00:00:00.000Z" }, facts: [] };
  await writeFile(file, JSON.stringify({ schemaVersion: 1, sourceLabel: "Digital Sansad", profiles: [profile] }));
  assert.equal((await listPublicMps(file)).length, 1);
  assert.equal((await getPublicMp(5619, file))?.constituency, "Jaipur");
  assert.equal(await getPublicMp(999999, file), undefined);
  await writeFile(file, JSON.stringify({ schemaVersion: 1, sourceLabel: "Digital Sansad", profiles: [profile, profile] }));
  assert.deepEqual(await listPublicMps(file), []);
});

test("production MP pages can read an explicitly supplied private export", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-mps-production-"));
  const file = join(directory, "profiles.json");
  const profile = { memberId: 5619, name: "Manju Sharma", party: "BJP", constituency: "Jaipur",
    state: "Rajasthan", membershipStatus: "Sitting", sourceCheckedAt: "2026-10-07T00:00:00.000Z",
    rosterSource: { url: "https://sansad.in/api_ls/member?page=1", contentHash: `sha256:${"a".repeat(64)}`,
      capturedAt: "2026-10-06T00:00:00.000Z" }, facts: [] };
  await writeFile(file, JSON.stringify({ schemaVersion: 1, sourceLabel: "Digital Sansad", profiles: [profile] }));
  const previous = process.env.VOTE_BETTER_MP_EXPORT;
  process.env.VOTE_BETTER_MP_EXPORT = file;
  try {
    assert.equal((await listPublicMps()).length, 1);
  } finally {
    if (previous === undefined) delete process.env.VOTE_BETTER_MP_EXPORT;
    else process.env.VOTE_BETTER_MP_EXPORT = previous;
  }
});
