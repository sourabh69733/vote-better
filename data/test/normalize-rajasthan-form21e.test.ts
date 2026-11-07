import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeJaipurForm21E } from "../src/normalize/rajasthan-form21e.js";
import type { Snapshot } from "../src/contracts.js";

const file = new URL("../extractions/jaipur-form21e-2024.json", import.meta.url);
const auditedHash = "sha256:b366199167e1759a15d1ae85ac8bfbb1233b746f10fed3a47a429d54fba17dd2";
const now = "2026-10-05T12:00:00.000Z";

async function transcription() {
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

function auditedSnapshot(): Snapshot {
  return {
    id: "snapshot-1", sourceId: "source-1", url: "https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-7.pdf",
    contentHash: auditedHash, capturedAt: now, recordedAt: now,
  };
}

test("normalizer produces page-linked draft facts with day precision", async () => {
  const facts = normalizeJaipurForm21E(auditedSnapshot(), await transcription(), now);
  assert.equal(facts.length, 47);
  const votes = facts.find((fact) => fact.locator === "page 1, candidate row 2, votes");
  assert.equal(votes?.normalizedValue, 886850);
  assert.equal(votes?.predicate, "candidate.votesPolled");
  assert.deepEqual(votes?.validFrom, { value: "2024-06-04", precision: "day", originalText: "04/06/2024" });
  assert.equal(votes?.sourcePublishedAt, undefined);
  assert.ok(facts.every((fact) => fact.normalizerVersion === "rajasthan-form21e-manual-v1"));
});

test("changed source bytes and inconsistent transcription cannot create drafts", async () => {
  const input = await transcription() as Record<string, any>;
  assert.throws(() => normalizeJaipurForm21E({ ...auditedSnapshot(), contentHash: `sha256:${"0".repeat(64)}` }, input, now), /hash/);
  assert.throws(() => normalizeJaipurForm21E(auditedSnapshot(), { ...input, totals: { ...input.totals, validVotes: 1 } }, now), /total/);
  assert.throws(() => normalizeJaipurForm21E(auditedSnapshot(), { ...input, candidates: [...input.candidates, input.candidates[0]] }, now), /row/);
});
