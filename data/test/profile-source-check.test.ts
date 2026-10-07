import assert from "node:assert/strict";
import test from "node:test";

import { compareSourceDrafts } from "../src/profile-source-check.js";
import type { ProfileReviewReport } from "../src/profile-review.js";

const url = "https://sansad.in/api_ls/member/5619?locale=en";
const report: ProfileReviewReport = {
  memberId: 5619, name: "Manju Sharma", rosterName: "Manju Sharma", token: "token", sources: [],
  observations: [{ id: "observation", predicate: "person.profession", locator: "member[mpsno=5619].mainProfessionName",
    value: "Social worker", sourceUrl: url, snapshotId: "snapshot" }],
};
const draft = { locator: report.observations[0].locator, predicate: "person.profession",
  rawValue: "Social worker", normalizedValue: "Social worker", normalizedAt: "2026-10-07T00:00:00.000Z",
  normalizerVersion: "sansad-ls-biography-v2" };

test("source replay requires matching fields, locators and values", () => {
  assert.deepEqual(compareSourceDrafts(report, [draft], url), []);
  assert.match(compareSourceDrafts(report, [{ ...draft, normalizedValue: "Different" }], url)[0], /changed normalization/);
  assert.match(compareSourceDrafts(report, [], url)[0], /missing in source replay/);
  assert.match(compareSourceDrafts(report, [draft, { ...draft, locator: "unexpected" }], url)[0], /missing saved observation/);
});
