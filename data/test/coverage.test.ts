import assert from "node:assert/strict";
import test from "node:test";

import { assessCoverage, type CoverageInput } from "../src/coverage.js";

const base: CoverageInput = {
  areaId: "jaipur-lok-sabha", factType: "election-result-candidates",
  sourceUrl: "https://example.org/return.pdf", computedAt: "2026-10-06T09:00:00.000Z",
  snapshot: { capturedAt: "2026-10-05T09:00:00.000Z", contentHash: `sha256:${"a".repeat(64)}`, candidateRows: 13 },
  publishedCandidateRows: 1,
  lastAttempt: { attemptedAt: "2026-10-05T09:00:00.000Z", outcome: "succeeded" },
  lastReviewedAt: "2026-10-05T11:00:00.000Z",
  lastPublishedAt: "2026-10-05T12:00:00.000Z",
  unresolvedConflicts: 0,
};

test("missing source check is missing coverage, not zero candidates", () => {
  const status = assessCoverage({ ...base, snapshot: undefined, publishedCandidateRows: 0,
    lastAttempt: { attemptedAt: "2026-10-06T08:00:00.000Z", outcome: "unavailable" } });
  assert.equal(status.state, "missing");
  assert.equal(status.observedCandidateRows, null);
  assert.equal(status.lastAttemptOutcome, "unavailable");
});

test("one reviewed row in a 13-row return is partial coverage", () => {
  const status = assessCoverage(base);
  assert.equal(status.state, "partial");
  assert.equal(status.publishedCandidateRows, 1);
  assert.equal(status.observedCandidateRows, 13);
  assert.equal(status.lastCapturedAt, base.snapshot?.capturedAt);
});

test("failed recheck marks prior published coverage stale", () => {
  const status = assessCoverage({ ...base, lastAttempt: { attemptedAt: "2026-10-06T08:00:00.000Z", outcome: "error" } });
  assert.equal(status.state, "stale");
  assert.equal(status.lastPublishedAt, base.lastPublishedAt);
});

test("unresolved conflicting result is disputed", () => {
  assert.equal(assessCoverage({ ...base, unresolvedConflicts: 1 }).state, "disputed");
});

test("successful unchanged refresh updates check time without changing capture time", () => {
  const status = assessCoverage({ ...base, publishedCandidateRows: 13,
    lastAttempt: { attemptedAt: "2026-10-06T08:00:00.000Z", outcome: "succeeded" } });
  assert.equal(status.state, "covered");
  assert.equal(status.lastAttemptedAt, "2026-10-06T08:00:00.000Z");
  assert.equal(status.lastCapturedAt, "2026-10-05T09:00:00.000Z");
});
