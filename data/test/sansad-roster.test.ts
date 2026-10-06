import assert from "node:assert/strict";
import test from "node:test";

import { assembleSansadRoster, type SansadClaimRow } from "../src/sansad-roster.js";

const baseUrl = "https://sansad.in/api_ls/member?loksabha=18&sitting=1&memberStatus=s&size=2";

function claims(id: number, page: number): SansadClaimRow[] {
  const values = {
    "person.sansadMemberId": String(id), "person.name": `Member ${id}`,
    "office.party": "Example Party", "office.state": "Rajasthan",
    "office.constituency": `Area ${id}`, "office.membershipStatus": "Sitting",
  };
  const fields: Record<string, string> = {
    "person.sansadMemberId": "mpsno", "person.name": "mpFirstLastName", "office.party": "partyFname",
    "office.state": "stateName", "office.constituency": "constName", "office.membershipStatus": "status",
  };
  return Object.entries(values).map(([predicate, value]) => ({
    snapshotId: `snapshot-${page}`, url: `${baseUrl}&page=${page}`, contentHash: `sha256:hash-${page}`,
    capturedAt: "2026-10-06T10:00:00.000Z", locator: `membersDtoList[mpsno=${id}].${fields[predicate]}`,
    predicate, value,
  }));
}

test("assembles one complete paged roster with source snapshots", () => {
  const result = assembleSansadRoster([...claims(1, 1), ...claims(2, 1), ...claims(3, 2)]);
  assert.deepEqual(result.members.map((item) => [item.id, item.constituency, item.snapshotId]), [
    [1, "Area 1", "snapshot-1"], [2, "Area 2", "snapshot-1"], [3, "Area 3", "snapshot-2"],
  ]);
  assert.deepEqual(result.snapshots.map((item) => item.page), [1, 2]);
});

test("rejects missing fields and incomplete page sets", () => {
  assert.throws(() => assembleSansadRoster([...claims(1, 1), ...claims(2, 2)]), /incomplete page/);
  const missingName = claims(1, 1).filter((row) => row.predicate !== "person.name");
  assert.throws(() => assembleSansadRoster([...missingName, ...claims(2, 1)]), /missing person.name/);
});

test("rejects mixed snapshots or duplicate member IDs", () => {
  assert.throws(() => assembleSansadRoster([...claims(1, 1), ...claims(2, 1).map((row) => ({ ...row, snapshotId: "other" }))]), /multiple snapshots/);
  assert.throws(() => assembleSansadRoster([...claims(1, 1), ...claims(2, 1), ...claims(1, 2)]), /repeated member/);
});
