import assert from "node:assert/strict";
import test from "node:test";
import { getPersonProfile, listPersonSlugs } from "./verified-profile";

test("person profiles resolve by slug without route-specific names", () => {
  assert.deepEqual(listPersonSlugs(), ["manju-sharma", "rao-rajendra-singh"]);
  assert.equal(getPersonProfile("manju-sharma")?.name, "Manju Sharma");
  assert.equal(getPersonProfile("rao-rajendra-singh")?.candidacies[0].votes, 617877);
  assert.equal(getPersonProfile("unknown-person"), null);
});
