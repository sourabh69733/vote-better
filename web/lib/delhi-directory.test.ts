import assert from "node:assert/strict";
import { test } from "node:test";
import { searchDelhiRecords } from "./delhi-directory";
import type { DelhiPublication } from "./delhi";

const publication: DelhiPublication = {
  schemaVersion: 1, audience: "preview", revision: `sha256:${"a".repeat(64)}`, generatedAt: "2026-10-09T00:00:00.000Z",
  institutions: [{ id: "i", name: "Delhi Police", kind: "police" }],
  offices: [{ id: "o1", institutionId: "i", title: "Missing Persons", traceId: "t1" }, { id: "o2", institutionId: "i", title: "Secretary", traceId: "t2" }],
  people: [{ id: "p1", name: "A Kumar" }, { id: "p2", name: "A Kumar" }],
  appointments: [{ id: "a1", officeId: "o1", personId: "p1", status: "source-listed", traceId: "t1" }, { id: "a2", officeId: "o2", personId: "p2", status: "former", traceId: "t2" }],
  jurisdictions: [], facilities: [], coverage: [{ sourceId: "police", state: "stale", publishedRows: 2, observedRows: 2, expectedRows: null }],
  traces: [{ id: "t1", observationId: "t1", sourceId: "police", sourceUrl: "https://example.org", locator: "1", contentHash: `sha256:${"b".repeat(64)}`, capturedAt: "2026-10-09T00:00:00.000Z", checkedAt: "2026-10-09T00:00:00.000Z", reviewedAt: "2026-10-09T00:00:00.000Z" }, { id: "t2", observationId: "t2", sourceId: "police", sourceUrl: "https://example.org", locator: "2", contentHash: `sha256:${"b".repeat(64)}`, capturedAt: "2026-10-09T00:00:00.000Z", checkedAt: "2026-10-09T00:00:00.000Z", reviewedAt: "2026-10-09T00:00:00.000Z" }],
};

test("office query ranks exact office and preserves two same-name people", () => {
  assert.equal(searchDelhiRecords(publication, "Missing Persons")[0].office.id, "o1");
  assert.equal(searchDelhiRecords(publication, "A Kumar").length, 2);
  assert.equal(searchDelhiRecords(publication, "unknown").length, 0);
});

test("a PIN or unverified area cannot imply a mapped office", () => {
  assert.equal(searchDelhiRecords(publication, "110001").length, 0);
  assert.equal(searchDelhiRecords(publication, "Secretary", "unverified-area").length, 0);
});
