import assert from "node:assert/strict";
import test from "node:test";

import { publicFacts } from "../src/export-local-mps.js";

test("public MP export keeps sourced profile fields and omits internal claims", () => {
  const source = { url: "https://sansad.in/api_ls/member/5619?locale=en",
    contentHash: `sha256:${"a".repeat(64)}`, capturedAt: "2026-10-07T00:00:00.000Z",
    locator: "member[mpsno=5619].education" };
  const facts = [
    { predicate: "person.educationStatement", value: "MA, LLB", source },
    { predicate: "person.sansadMemberId", value: "5619", source },
    { predicate: "person.photoUrl", value: "https://sansad.in/photo", source },
  ];
  assert.deepEqual(publicFacts(facts).map((fact) => fact.predicate), ["person.educationStatement", "person.photoUrl"]);
});
