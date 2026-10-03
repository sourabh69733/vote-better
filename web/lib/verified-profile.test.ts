import assert from "node:assert/strict";
import test from "node:test";
import { getPersonProfile, listPersonSlugs } from "./verified-profile";

test("person profiles resolve by slug without route-specific names", () => {
  assert.deepEqual(listPersonSlugs(), ["manju-sharma"]);
  assert.equal(getPersonProfile("manju-sharma")?.name, "Manju Sharma");
  assert.equal(getPersonProfile("unknown-person"), null);
});
