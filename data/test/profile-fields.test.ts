import assert from "node:assert/strict";
import test from "node:test";

import { assertProfileDrafts, profileFields } from "../src/profile-fields.js";
import type { ObservationDraft } from "../src/store.js";

const draft = (predicate: string): ObservationDraft => ({
  locator: "membersDtoList[mpsno=5619].status",
  predicate,
  rawValue: "Sitting",
  normalizedValue: "Sitting",
  normalizedAt: "2026-10-07T00:00:00.000Z",
  normalizerVersion: "test-v1",
});

test("known Sansad profile observations pass the source contract", () => {
  const observations = [draft("person.name"), draft("office.membershipStatus")];
  assert.doesNotThrow(() => assertProfileDrafts("sansad-member-list", observations));
  assert.equal(profileFields["office.membershipStatus"].subject, "office-term");
});

test("unknown profile fields fail before they enter the review queue", () => {
  assert.throws(() => assertProfileDrafts("sansad-member-list", [draft("person.favoriteColor")]),
    /unknown profile field/);
});

test("a source cannot claim facts outside its declared scope", () => {
  assert.throws(() => assertProfileDrafts("sansad-member-list", [draft("candidacy.status")]),
    /not supported by sansad-member-list/);
});

test("field contracts distinguish current facts from filing snapshots", () => {
  assert.equal(profileFields["candidacy.status"].time, "changing");
  assert.equal(profileFields["affidavit.assets"].time, "filing-snapshot");
});
