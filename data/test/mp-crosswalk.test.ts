import assert from "node:assert/strict";
import test from "node:test";

import { buildMpCrosswalk } from "../src/mp-crosswalk.js";

const areas = {
  "806": { label: "JAIPUR RURAL", state: "RAJASTHAN" },
  "807": { label: "JAIPUR", state: "RAJASTHAN" },
  "900": { label: "UNMATCHED", state: "RAJASTHAN" },
};

function member(id: number, constituency: string, state = "Rajasthan", status = "Sitting") {
  return { id, name: `Member ${id}`, party: "Example Party", constituency, state, status,
    snapshotId: `snapshot-${id}` };
}

test("matches only a unique exact state and constituency pair", () => {
  const result = buildMpCrosswalk(areas, [member(1, "Jaipur"), member(2, "Jaipur Rural")]);
  assert.deepEqual(result.proposed, [
    { areaId: "806", memberId: 2 }, { areaId: "807", memberId: 1 },
  ]);
  assert.deepEqual(result.unmatchedAreaIds, ["900"]);
  assert.deepEqual(result.unmatchedMemberIds, []);
});

test("duplicate names and duplicate area labels need review", () => {
  const result = buildMpCrosswalk({
    "807": areas["807"], "808": areas["807"], "900": areas["900"],
  }, [member(1, "Jaipur"), member(2, "Jaipur")]);
  assert.deepEqual(result.proposed, []);
  assert.deepEqual(result.ambiguousAreas, [
    { areaId: "807", memberIds: [1, 2] }, { areaId: "808", memberIds: [1, 2] },
  ]);
  assert.deepEqual(result.ambiguousMembers, [
    { memberId: 1, areaIds: ["807", "808"] }, { memberId: 2, areaIds: ["807", "808"] },
  ]);
});

test("similar names and non-sitting members are not silently matched", () => {
  const result = buildMpCrosswalk(areas, [member(1, "Jaipur City"), member(2, "Jaipur", "Rajasthan", "Former")]);
  assert.deepEqual(result.proposed, []);
  assert.deepEqual(result.unmatchedMemberIds, [1, 2]);
  assert.deepEqual(result.unmatchedAreaIds, ["806", "807", "900"]);
});
