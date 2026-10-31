import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import { proposeMatches } from "../src/match.js";
import type { Observation } from "../src/contracts.js";

function observation(predicate: string, value: string): Observation {
  return { id: randomUUID(), snapshotId: randomUUID(), locator: "page 1, candidate row 1, name",
    predicate, rawValue: value, normalizedValue: value,
    normalizedAt: new Date().toISOString(), normalizerVersion: "test-v1", recordedAt: new Date().toISOString() };
}

test("same name across two people remains ambiguous", () => {
  const matches = proposeMatches(observation("candidate.name", "A Sharma"), [
    { id: "person-1", displayName: "A Sharma", officialIds: [] },
    { id: "person-2", displayName: "A Sharma", officialIds: [] },
  ]);
  assert.equal(matches.length, 2);
  assert.ok(matches.every((item) => item.status === "ambiguous"));
});

test("an official identifier links exactly one existing entity", () => {
  const matches = proposeMatches(observation("person.officialId", "ECI-123"), [
    { id: "person-1", displayName: "A Sharma", officialIds: ["ECI-123"] },
    { id: "person-2", displayName: "A Sharma", officialIds: ["ECI-456"] },
  ]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].entityId, "person-1");
  assert.equal(matches[0].status, "proposed");
});
