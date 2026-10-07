import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { isReviewedDraftFact, loadDraftProfileIds, loadDraftProfilePreview } from "./draft-profile-preview";

test("local draft accepts sourced biography fields without review", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-draft-"));
  const path = join(directory, "5620.json");
  const source = { url: "https://sansad.in/api_ls/member/5620?locale=en",
    contentHash: `sha256:${"a".repeat(64)}`, capturedAt: "2026-10-07T08:00:00.000Z",
    locator: "member[mpsno=5620].education" };
  const value = { schemaVersion: 1, access: "local-unverified-profile", memberId: 5620,
    personName: "Example MP", generatedAt: "2026-10-07T10:00:00.000Z",
    facts: [{ predicate: "person.educationStatement", value: "BA", source },
      { predicate: "office.positionsHeld", value: [{ title: "Committee member" }],
        source: { ...source, url: "https://sansad.in/api_ls/member/positionHeld?mpCode=5620&locale=en" } }] };
  await writeFile(path, JSON.stringify(value));
  assert.equal((await loadDraftProfilePreview(5620, path))?.facts[0].value, "BA");
  assert.deepEqual((await loadDraftProfilePreview(5620, path))?.facts[1].value, [{ title: "Committee member" }]);
  assert.equal(await loadDraftProfilePreview(5619, path), null);
  await writeFile(path, JSON.stringify({ ...value, facts: [{ ...value.facts[0], source: {
    ...source, url: "https://example.org/education" } }] }));
  assert.equal(await loadDraftProfilePreview(5620, path), null);
});

test("draft index lists only collected member IDs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-draft-index-"));
  const path = join(directory, "index.json");
  await writeFile(path, JSON.stringify({ schemaVersion: 1, access: "local-unverified-profile",
    generatedAt: "2026-10-07T10:00:00.000Z", memberIds: [5619, 5620] }));
  assert.deepEqual(await loadDraftProfileIds(path), [5619, 5620]);
  await writeFile(path, JSON.stringify({ schemaVersion: 1, access: "local-unverified-profile",
    memberIds: [5619, 5619] }));
  assert.deepEqual(await loadDraftProfileIds(path), []);
});

test("draft is reviewed only when the approved value and source match", () => {
  const source = { url: "https://sansad.in/api_ls/member/5620?locale=en",
    contentHash: `sha256:${"a".repeat(64)}`, capturedAt: "2026-10-07T08:00:00.000Z",
    locator: "member[mpsno=5620].education" };
  const draft = { predicate: "person.educationStatement", value: "BA", source };
  const reviewed = [{ ...draft, reviewedAt: "2026-10-07T10:00:00.000Z" }];
  assert.equal(isReviewedDraftFact(draft, reviewed), true);
  assert.equal(isReviewedDraftFact({ ...draft, value: "MA" }, reviewed), false);
  assert.equal(isReviewedDraftFact({ ...draft, source: { ...source,
    contentHash: `sha256:${"b".repeat(64)}` } }, reviewed), false);
});
