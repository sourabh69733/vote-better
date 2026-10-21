import assert from "node:assert/strict";
import test from "node:test";

import { linkMpToSeat, sameName } from "./mp-seat-link";

const mp = (memberId: number, name: string, state: string, constituency: string) => ({ memberId, name, state, constituency });

test("MPs link to their 2024 seat by seat and name", () => {
  const jaipur = linkMpToSeat(mp(1, "Smt. Manju Sharma", "Rajasthan", "Jaipur"));
  assert.equal(jaipur.status, "won-2024");
  assert.equal(jaipur.status === "won-2024" && jaipur.candidate?.slug, "manju-sharma");
  assert.equal(linkMpToSeat(mp(2, "Shri Trivendra Singh Rawat", "Uttarakhand", "Hardwar")).status, "won-2024");
  assert.equal(linkMpToSeat(mp(3, "Shri Somebody Else", "Rajasthan", "Jaipur")).status, "unlinked");
  assert.equal(linkMpToSeat(mp(4, "Shri Nobody", "Rajasthan", "Atlantis")).status, "unlinked");
});

test("reviewed exceptions cover spellings and by-elections", () => {
  assert.equal(linkMpToSeat(mp(4619, "Smt. Hema Malini", "Uttar Pradesh", "Mathura")).status, "won-2024");
  const wayanad = linkMpToSeat(mp(5836, "Smt. Priyanka Gandhi Vadra", "Kerala", "Wayanad"));
  assert.equal(wayanad.status, "by-election");
  assert.equal(linkMpToSeat(mp(9999, "Smt. Hema Malini", "Uttar Pradesh", "Mathura")).status, "unlinked");
});

test("name matching ignores titles but not different people", () => {
  assert.ok(sameName("Dr. Amol Ramsing Kolhe", "DR. AMOL RAMSING KOLHE"));
  assert.ok(sameName("Shri Bastipati Nagaraju", "BASTIPATI NAGARAJU PANCHALINGALA"));
  assert.ok(!sameName("Shri Chavan Ravindra Vasantrao", "CHAVAN VASANTRAO BALWANTRAO"));
  assert.ok(!sameName("Smt. Priyanka Gandhi Vadra", "RAHUL GANDHI"));
});
