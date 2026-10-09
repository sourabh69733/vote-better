import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDelhiReviewCases } from "../src/delhi/review.js";
import type { Observation } from "../src/contracts.js";

const make = (id: string, locator: string, value: Record<string, string>): Observation => ({ id, snapshotId: `snapshot-${id}`, locator, predicate: "appointment.holder", rawValue: "name", normalizedValue: value, normalizedAt: "2026-10-09T00:00:00.000Z", normalizerVersion: "test", recordedAt: "2026-10-09T00:00:00.000Z" });

test("changed holder and same-name rows require separate review", () => {
  const cases = buildDelhiReviewCases([
    make("old", "office:1", { name: "Person A", role: "Secretary" }),
    make("new", "office:1", { name: "Person B", role: "Secretary" }),
    make("elsewhere", "office:2", { name: "Person B", role: "Director" }),
  ]);
  assert.ok(cases.some((item) => item.kind === "changed-holder" && item.observationIds.includes("old") && item.observationIds.includes("new")));
  assert.ok(cases.some((item) => item.kind === "possible-namesake" && item.observationIds.includes("new") && item.observationIds.includes("elsewhere")));
});
