import assert from "node:assert/strict";
import test from "node:test";

import { contestHref, electionTotals, findSeat, loadResults, marginsInState, ordinal, seatHistory, seatWinner, statesOf, validateResults, type ResultSeat } from "./lok-sabha";

test("all three Lok Sabha results files load and pass validation", () => {
  for (const id of ["lok-sabha-2024", "lok-sabha-2019", "lok-sabha-2014"] as const) {
    const results = loadResults(id);
    assert.ok(results, `${id} is published`);
    assert.equal(results.election.id, id);
    assert.ok(results.seats.length >= 542);
  }
  assert.equal(loadResults("lok-sabha-2014")!.seats.filter((seat) => seat.winnerOnly).length, 32);
});

test("validation rejects a file for the wrong election or with an unknown party", () => {
  const real = loadResults("lok-sabha-2019")!;
  assert.throws(() => validateResults(real, "lok-sabha-2014"), /not the lok-sabha-2014/);
  const broken = structuredClone(real);
  broken.seats[0].candidates[0].party = "NOT-A-PARTY";
  assert.throws(() => validateResults(broken, "lok-sabha-2019"), /unknown party/);
});

test("the winner reads the same way for contested, unopposed and winner-only seats", () => {
  const base = { state: "S", stateSlug: "s", number: null, reservation: "GEN", name: "X", sourceName: "X", slug: "x", unopposed: null, electors: null, votesPolled: null, validVotes: null, notaVotes: null, candidates: [] } satisfies ResultSeat;
  assert.deepEqual(seatWinner({ ...base, winnerOnly: { winner: "A", party: "P", margin: 10 } }), { name: "A", party: "P", margin: 10, share: null, how: "winner-only" });
  assert.equal(seatWinner({ ...base, unopposed: { winner: "B", party: "P", nominated: 1, rejected: 0, withdrawn: 0 } })?.how, "unopposed");
  assert.equal(seatWinner(base), null);
  const jaipur = findSeat("lok-sabha-2024", "rajasthan", "jaipur")!;
  assert.deepEqual(seatWinner(jaipur), { name: "Manju Sharma", party: "BJP", margin: 331767, share: 61.04, how: "contested" });
});

test("Jaipur has a history across all three elections, newest first", () => {
  const history = seatHistory("rajasthan", "jaipur");
  assert.deepEqual(history.map((entry) => entry.year), [2024, 2019, 2014]);
  assert.ok(history.every((entry) => entry.winner.party === "BJP"));
  assert.equal(contestHref("lok-sabha-2024", history[0].seat), "/seats/rajasthan/jaipur");
  assert.equal(contestHref("lok-sabha-2019", history[1].seat), "/elections/lok-sabha-2019/rajasthan/jaipur");
});

test("state margins and election totals come out of the published figures", () => {
  const results = loadResults("lok-sabha-2024")!;
  const rajasthan = marginsInState(results, "rajasthan");
  assert.equal(rajasthan.length, 25);
  assert.equal(rajasthan.at(-1)!.seat.name, "Jaipur Rural");
  assert.equal(rajasthan.at(-1)!.margin, 1615);
  assert.equal(rajasthan.findIndex((row) => row.seat.slug === "jaipur") + 1, 5);
  const totals = electionTotals(results);
  assert.equal(totals.candidates, 8359);
  assert.ok(totals.turnout! > 60 && totals.turnout! < 70);
  assert.ok(statesOf(results).length >= 36);
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
});
