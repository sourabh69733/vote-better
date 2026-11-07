import assert from "node:assert/strict";
import test from "node:test";

import { elections } from "../records/elections";
import { previousResult } from "./results";

const tally = (id: string) => {
  const next = elections.find((election) => election.id === id)!;
  const last = previousResult(next);
  return { id: last?.election.id, parties: Object.fromEntries(last?.parties.slice(0, 2).map((party) => [party.code, party.seats]) ?? []) };
};

test("each 2027 election shows its 2022 result, with the seat totals ECI declared", () => {
  assert.deepEqual(tally("goa-assembly-2027"), { id: "goa-assembly-2022", parties: { BJP: 20, INC: 11 } });
  assert.deepEqual(tally("manipur-assembly-2027"), { id: "manipur-assembly-2022", parties: { BJP: 32, NPEP: 7 } });
  assert.deepEqual(tally("punjab-assembly-2027"), { id: "punjab-assembly-2022", parties: { AAAP: 92, INC: 18 } });
  assert.deepEqual(tally("uttarakhand-assembly-2027"), { id: "uttarakhand-assembly-2022", parties: { BJP: 47, INC: 19 } });
  assert.deepEqual(tally("uttar-pradesh-assembly-2027"), { id: "uttar-pradesh-assembly-2022", parties: { BJP: 255, SP: 111 } });
});

test("an election with no earlier result on the site shows none", () => {
  assert.equal(previousResult({ id: "gujarat-assembly-2027", body: "assembly", states: ["Gujarat"] }), undefined);
});
