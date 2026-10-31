import assert from "node:assert/strict";
import test from "node:test";

import { memberTargets } from "../src/sansad-all-members-archive.js";

test("every member with one unique name in every session becomes a target; the rest are reported", () => {
  const latest = [{ mpNo: 1, mpName: "Shri A" }, { mpNo: 2, mpName: "Shri B" }, { mpNo: 3, mpName: "Shri B" }, { mpNo: 4, mpName: "Smt. C" }];
  const earlier = [{ mpNo: 1, mpName: "Shri A" }, { mpNo: 2, mpName: "Shri B" }, { mpNo: 3, mpName: "Shri B" }];
  const { targets, excluded } = memberTargets([earlier, latest]);
  assert.deepEqual(targets, [{ personId: "sansad-1", memberId: 1, officialName: "Shri A" }]);
  assert.deepEqual(excluded.map((item) => [item.mpNo, item.reason]), [
    [2, "name shared with another member"], [3, "name shared with another member"], [4, "not listed under this name in every session"],
  ]);
});
