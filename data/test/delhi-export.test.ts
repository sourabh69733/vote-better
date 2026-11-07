import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDelhiPublication, type ReviewedDelhiRow } from "../src/delhi/export.js";

const row: ReviewedDelhiRow = {
  observationId: "observation-1", institutionId: "institution-1", institutionName: "Services Department", institutionKind: "department",
  officeId: "office-1", officeTitle: "Secretary", personId: "person-1", personName: "A Person", status: "source-listed",
  source: { id: "gnctd-services-officers", url: "https://services.delhi.gov.in/who-is-who", locator: "table:row:1", contentHash: `sha256:${"a".repeat(64)}`, capturedAt: "2026-10-09T00:00:00.000Z" },
  review: { decision: "approved", reviewedAt: "2026-10-09T01:00:00.000Z" },
  check: { contentHash: `sha256:${"a".repeat(64)}`, checkedAt: "2026-10-09T00:30:00.000Z" },
  reuseStatus: "review-required", contactKind: "official", officeContact: "011-12345678",
};

test("preview publication has trace and blocks unreviewed, stale-check and private facts", () => {
  const publication = buildDelhiPublication([row], "preview");
  assert.equal(publication.appointments.length, 1);
  assert.equal(publication.traces[0].observationId, "observation-1");
  assert.throws(() => buildDelhiPublication([{ ...row, review: { ...row.review, decision: "needs-changes" } }], "preview"), /approved/i);
  assert.throws(() => buildDelhiPublication([{ ...row, check: { ...row.check, contentHash: `sha256:${"b".repeat(64)}` } }], "preview"), /check/i);
  assert.throws(() => buildDelhiPublication([{ ...row, contactKind: "private" }], "preview"), /private/i);
  assert.throws(() => buildDelhiPublication([row], "production"), /reuse/i);
});

test("official profile link must stay on the observed source host", () => {
  assert.throws(() => buildDelhiPublication([{ ...row, profilePath: "https://elsewhere.example/profile/a" }], "preview"), /profile link/i);
  const publication = buildDelhiPublication([{ ...row, party: "BJP", profilePath: "/profile/a" }], "preview");
  assert.equal(publication.appointments[0].officialProfileUrl, "https://services.delhi.gov.in/profile/a");
  assert.equal(publication.appointments[0].party, "BJP");
});

test("one office cannot have two asserted current holders", () => {
  assert.throws(() => buildDelhiPublication([{ ...row, status: "current" }, { ...row, observationId: "observation-2", personId: "person-2", personName: "B Person", status: "current" }], "preview"), /current/i);
});

test("coverage reports reviewed versus observed rows without claiming complete coverage", () => {
  const publication = buildDelhiPublication([row], "preview", "2026-10-09T02:00:00.000Z", [{ sourceId: row.source.id, state: "partial", observedRows: 25, expectedRows: null }]);
  assert.deepEqual(publication.coverage[0], { sourceId: row.source.id, state: "partial", publishedRows: 1, observedRows: 25, expectedRows: null, lastCapturedAt: row.source.capturedAt });
});
