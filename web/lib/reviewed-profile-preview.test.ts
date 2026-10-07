import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadReviewedProfilePreview } from "./reviewed-profile-preview";

test("local reviewed preview requires matching member and sourced review facts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-profile-"));
  const path = join(directory, "5619.json");
  const value = { schemaVersion: 1, access: "local-review-preview", memberId: 5619,
    personKey: "manju-sharma", personName: "Manju Sharma", reviewStatus: "partial",
    generatedAt: "2026-10-07T10:00:00.000Z", facts: [{ predicate: "person.educationStatement",
      value: "MA, LLB; University of Rajasthan", reviewedAt: "2026-10-07T09:00:00.000Z",
      source: { url: "https://sansad.in/api_ls/member/5619?locale=en",
        contentHash: `sha256:${"a".repeat(64)}`, capturedAt: "2026-10-07T08:00:00.000Z",
        locator: "member[mpsno=5619].education" } }] };
  await writeFile(path, JSON.stringify(value));
  assert.equal((await loadReviewedProfilePreview(5619, path))?.facts[0].value,
    "MA, LLB; University of Rajasthan");
  assert.equal(await loadReviewedProfilePreview(5620, path), null);
  await writeFile(path, JSON.stringify({ ...value, facts: [{ ...value.facts[0], source: {
    ...value.facts[0].source, url: "https://example.org/claim" } }] }));
  assert.equal(await loadReviewedProfilePreview(5619, path), null);
});
