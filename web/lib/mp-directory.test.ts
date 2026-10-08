import assert from "node:assert/strict";
import test from "node:test";

import { paginateMpResults } from "./mp-directory";

test("national directory returns one page at a time and clamps invalid pages", () => {
  const members = Array.from({ length: 53 }, (_, id) => id + 1);
  assert.deepEqual(paginateMpResults(members, "2"), {
    items: members.slice(24, 48), page: 2, pageCount: 3, first: 25, last: 48,
  });
  assert.equal(paginateMpResults(members, "999").page, 3);
  assert.equal(paginateMpResults(members, "bad").page, 1);
  assert.deepEqual(paginateMpResults([], "1"), { items: [], page: 1, pageCount: 1, first: 0, last: 0 });
});
