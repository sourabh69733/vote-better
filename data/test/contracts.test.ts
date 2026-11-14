import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCoverageStatus,
  assertEntityMatch,
  assertObservation,
  assertPublishedFact,
  assertReviewDecision,
  assertSnapshot,
  assertSource,
  assertSourceTime,
  isUtcInstant,
  type Observation,
  type CoverageStatus,
  type PublishedFact,
  type ReviewDecision,
} from "../src/contracts.js";

const observed: Observation = {
  id: "obs-1",
  recordedAt: "2026-10-05T10:00:00.000Z",
  snapshotId: "snapshot-1",
  locator: "page 1, candidate row 2",
  predicate: "candidate.votesPolled",
  rawValue: "886850",
  normalizedValue: 886850,
  validFrom: { value: "2024-06-04", precision: "day", originalText: "04/06/2024" },
  normalizedAt: "2026-10-05T10:00:00.000Z",
  normalizerVersion: "form21e-v1",
};

test("persisted observations require a source snapshot, locator, and recordedAt", () => {
  assert.doesNotThrow(() => assertObservation(observed));
  assert.throws(() => assertObservation({ ...observed, snapshotId: "" }));
  assert.throws(() => assertObservation({ ...observed, locator: "" }));
  assert.throws(() => assertObservation({ ...observed, recordedAt: undefined } as unknown as Observation));
});

test("source, snapshot, match and review records each require a UTC recordedAt", () => {
  const source = {
    id: "source-1", recordedAt: observed.recordedAt, authority: "Rajasthan CEO",
    url: "https://election.rajasthan.gov.in/result.pdf", documentType: "Form 21E",
  };
  const snapshot = {
    id: "snapshot-1", recordedAt: observed.recordedAt, sourceId: source.id,
    url: source.url, contentHash: `sha256:${"a".repeat(64)}`, capturedAt: observed.recordedAt,
  };
  const match = {
    id: "match-1", recordedAt: observed.recordedAt, observationId: observed.id,
    entityId: "person-1", status: "confirmed" as const, reason: "Official contest identifier",
  };
  const review = {
    id: "review-1", recordedAt: observed.recordedAt, observationIds: [observed.id],
    decision: "approved" as const, reviewerId: "reviewer-1", reason: "Checked page 1",
    reviewedAt: observed.recordedAt,
  };
  assert.doesNotThrow(() => assertSource(source));
  assert.doesNotThrow(() => assertSnapshot(snapshot));
  assert.doesNotThrow(() => assertEntityMatch(match));
  assert.doesNotThrow(() => assertReviewDecision(review));
  assert.throws(() => assertSource({ ...source, recordedAt: "2026-10-05" }));
  assert.throws(() => assertSnapshot({ ...snapshot, capturedAt: "2026-10-05" }));
  assert.throws(() => assertEntityMatch({ ...match, entityId: "" }));
  assert.throws(() => assertReviewDecision({ ...review, reviewedAt: "2026-10-05" }));
});

test("system instants must be real UTC instants", () => {
  assert.equal(isUtcInstant("2026-10-05T10:00:00.000Z"), true);
  assert.equal(isUtcInstant("2026-10-05"), false);
  assert.equal(isUtcInstant("2026-10-05T15:30:00+05:30"), false);
  assert.equal(isUtcInstant("2026-02-30T10:00:00.000Z"), false);
  assert.throws(() => assertObservation({ ...observed, normalizedAt: "2026-10-05" }));
});

test("source dates retain their precision and original wording", () => {
  assert.doesNotThrow(() =>
    assertSourceTime({ value: "2024-06", precision: "month", originalText: "June 2024" }),
  );
  assert.throws(() =>
    assertSourceTime({ value: "2024-06-01", precision: "month", originalText: "June 2024" }),
  );
  assert.throws(() =>
    assertSourceTime({ value: "2024-02-30", precision: "day", originalText: "30/02/2024" }),
  );
  assert.throws(() =>
    assertSourceTime({ value: "2024-06", precision: "month", originalText: "" }),
  );
});

test("observation validity cannot end before it begins", () => {
  assert.throws(() =>
    assertObservation({
      ...observed,
      validFrom: { value: "2024-07", precision: "month", originalText: "July 2024" },
      validTo: { value: "2024-06", precision: "month", originalText: "June 2024" },
    }),
  );
  assert.doesNotThrow(() =>
    assertObservation({
      ...observed,
      validFrom: { value: "2024-06", precision: "month", originalText: "June 2024" },
      validTo: { value: "2024-06-30", precision: "day", originalText: "30 June 2024" },
    }),
  );
});

test("coverage state is explicit", () => {
  const coverage: CoverageStatus = {
    id: "coverage-1",
    recordedAt: "2026-10-05T10:00:00.000Z",
    areaId: "jaipur",
    factType: "candidate-results",
    state: "partial",
    reason: "Only Form 21E checked",
  };
  assert.doesNotThrow(() => assertCoverageStatus(coverage));
  assert.throws(() => assertCoverageStatus({ ...coverage, state: undefined } as unknown as CoverageStatus));
  assert.throws(() => assertCoverageStatus({ ...coverage, state: "complete" } as unknown as CoverageStatus));
});

test("publication requires a recorded approval for every cited observation", () => {
  const fact: PublishedFact = {
    id: "fact-1",
    recordedAt: "2026-10-05T11:00:00.000Z",
    entityId: "person-1",
    predicate: "candidate.votesPolled",
    value: 886850,
    observationIds: ["obs-1"],
    revisionId: "revision-1",
    publishedAt: "2026-10-05T11:00:00.000Z",
  };
  const approval: ReviewDecision = {
    id: "decision-1",
    recordedAt: "2026-10-05T10:30:00.000Z",
    observationIds: ["obs-1"],
    decision: "approved",
    reviewerId: "reviewer-1",
    reason: "Checked against source page 1",
    reviewedAt: "2026-10-05T10:30:00.000Z",
  };
  assert.throws(() => assertPublishedFact(fact, []));
  assert.throws(() => assertPublishedFact({ ...fact, observationIds: [] }, [approval]));
  assert.throws(() => assertPublishedFact(fact, [{ ...approval, reviewedAt: "2026-10-05T12:00:00.000Z" }]));
  assert.doesNotThrow(() => assertPublishedFact(fact, [approval]));
});
