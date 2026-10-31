import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSansadMembers } from "../src/normalize/sansad-members.js";
import type { Snapshot } from "../src/contracts.js";

const snapshot: Snapshot = {
  id: "snapshot-1", sourceId: "source-1", url: "https://sansad.in/api_ls/member?loksabha=18&page=1&size=100",
  contentHash: `sha256:${"a".repeat(64)}`, capturedAt: "2026-10-06T10:00:00.000Z", recordedAt: "2026-10-06T10:00:00.000Z",
};

test("normalizes sourced member facts without inventing career dates", () => {
  const input = { metaDatasDto: { currentPageNumber: 1, perPageSize: 100, totalElements: 1, totalPages: 1 }, membersDtoList: [{
    mpsno: 5619, mpFirstLastName: "Smt. Manju Sharma", partyFname: "Bharatiya Janata Party",
    stateName: "Rajasthan ", constName: "Jaipur", status: "Sitting", qualification: "Post Graduate ",
    profession: "Social Reformer ", dob: "02/09/1960", lsExpr: "18", noOfTerms: 1,
  }] };
  const drafts = normalizeSansadMembers(snapshot, input, "2026-10-06T10:01:00.000Z");
  assert.equal(drafts.find((draft) => draft.predicate === "person.name")?.normalizedValue, "Smt. Manju Sharma");
  assert.equal(drafts.find((draft) => draft.predicate === "office.constituency")?.normalizedValue, "Jaipur");
  assert.equal(drafts.find((draft) => draft.predicate === "person.educationLevel")?.normalizedValue, "Post Graduate");
  assert.equal(drafts.find((draft) => draft.predicate === "person.birthDate")?.normalizedValue, "1960-09-02");
  assert.ok(drafts.every((draft) => draft.locator.startsWith("membersDtoList[mpsno=5619].")));
  assert.ok(drafts.every((draft) => draft.validFrom === undefined));
});

test("rejects incomplete pages and duplicate IDs", () => {
  const member = { mpsno: 5619, mpFirstLastName: "Smt. Manju Sharma", partyFname: "BJP", stateName: "Rajasthan", constName: "Jaipur", status: "Sitting" };
  const metaDatasDto = { currentPageNumber: 1, perPageSize: 100, totalElements: 2, totalPages: 1 };
  assert.throws(() => normalizeSansadMembers(snapshot, { metaDatasDto, membersDtoList: [member] }, snapshot.capturedAt));
  assert.throws(() => normalizeSansadMembers(snapshot, { metaDatasDto, membersDtoList: [member, member] }, snapshot.capturedAt));
});

test("accepts the ISO birth dates in the current Parliament feed", () => {
  const input = { metaDatasDto: { currentPageNumber: 1, perPageSize: 1, totalElements: 1, totalPages: 1 }, membersDtoList: [{
    mpsno: 5814, mpFirstLastName: "Member", partyFname: "Party", stateName: "State", constName: "Area",
    status: "Sitting", dob: "1968-08-31",
  }] };
  const drafts = normalizeSansadMembers(snapshot, input, snapshot.capturedAt);
  assert.equal(drafts.find((draft) => draft.predicate === "person.birthDate")?.normalizedValue, "1968-08-31");
});
