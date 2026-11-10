import assert from "node:assert/strict";
import test from "node:test";

import { heldByeElections } from "../records/held-bye-elections";
import { loadResults, type ResultElectionId } from "./results";

const RESULTS: Record<string, ResultElectionId> = {
  Goa: "goa-assembly-2022", Manipur: "manipur-assembly-2022", Punjab: "punjab-assembly-2022",
  Uttarakhand: "uttarakhand-assembly-2022", "Uttar Pradesh": "uttar-pradesh-assembly-2022",
};
const plain = (value: string) => value.toLowerCase().replace(/\((sc|st)\)/g, "").replace(/[^a-z]/g, "");

test("every flagged bye-election names a real seat, by number and name, held after the 2022 count", () => {
  const seen = new Set<string>();
  for (const held of heldByeElections) {
    const results = loadResults(RESULTS[held.state]);
    assert.ok(results, `${held.state}: no 2022 results`);
    const seat = results.seats.find((item) => item.number === held.seat);
    assert.ok(seat, `${held.state} ${held.seat}: no such seat`);
    assert.equal(plain(seat.name), plain(held.name), `${held.state} ${held.seat}: the notice's name differs from the result`);
    assert.ok(held.countedOn > "2022-03-10", `${held.name}: counted before the 2022 results`);
    assert.ok(!seen.has(`${held.state}/${held.seat}/${held.countedOn}`), `${held.name}: listed twice`);
    seen.add(`${held.state}/${held.seat}/${held.countedOn}`);
  }
  assert.equal(heldByeElections.length, 33);
});
