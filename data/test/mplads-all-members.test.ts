import assert from "node:assert/strict";
import test from "node:test";

import { seatMember } from "../src/mplads-all-members.js";
import { REPORTS } from "../src/mplads-works.js";

const seat = { stateId: 6, state: "Bihar", constituencyId: 67, constituency: "UJIARPUR" };

// Every report lists rows naming these MPs, then a total row.
const responses = (captions: string[], ...rowNames: string[]) => ({
  member: JSON.stringify(captions.map((CAPTION, index) => ({ ID: index + 1, CAPTION }))),
  reports: Object.fromEntries(Object.entries(REPORTS).map(([name, { list, amount }]) => [name, JSON.stringify({
    [list]: JSON.stringify([...rowNames.map((MP_NAME) => ({ MP_NAME, [amount]: 0 })), { Total_Amt: 0 }]),
  })])) as Record<keyof typeof REPORTS, string>,
});

test("a seat's MP is the one eSAKSHI lists, with spacing tidied", () => {
  assert.deepEqual(seatMember(seat, responses(["Sunil Kumar "])), {
    personId: "esakshi-67", officialName: "Sunil Kumar", stateId: 6, constituencyId: 67, constituency: "UJIARPUR",
  });
  assert.throws(() => seatMember(seat, responses([])), /no MP listed/);
});

test("one MP listed under two accounts is the name the reports carry; two people are left out", () => {
  assert.equal(seatMember(seat, responses(["NITYANAND RAI", "Nityanand Rai"], "Nityanand Rai")).officialName, "Nityanand Rai");
  assert.equal(seatMember(seat, responses(["DHARAMBIR SINGH", "Shri  Dharambir Singh"], "Shri  Dharambir Singh")).officialName, "Shri Dharambir Singh");
  assert.throws(() => seatMember(seat, responses(["A B", "C D"], "A B", "C D")), /2 MPs listed \(A B, C D\); reports name A B, C D/);
  assert.throws(() => seatMember(seat, responses(["A B", "C D"], "E F")), /reports name E F/);
  assert.throws(() => seatMember(seat, responses(["A B", "C D"])), /reports name no one/);
});
