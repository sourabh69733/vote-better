import assert from "node:assert/strict";
import test from "node:test";
import { getParliamentaryDebates } from "./parliamentary-debates";

test("official debate records attach only to the two reviewed MP profiles", () => {
  for (const [personId, count] of [["manju-sharma", 48], ["rao-rajendra-singh", 22]] as const) {
    const work = getParliamentaryDebates(personId);
    assert.ok(work);
    assert.equal(work.records.length, count);
    assert.ok(work.records.every((record) => record.sourceUrl.startsWith("https://sansad.in/ls/debates/view-debate?")));
    assert.equal(new Set(work.records.map((record) => record.id)).size, count);
  }
  assert.equal(getParliamentaryDebates("jaipur-lok-sabha-2024-candidate-row-07"), null);
});
