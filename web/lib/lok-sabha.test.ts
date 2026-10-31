import assert from "node:assert/strict";
import test from "node:test";

import { electionTotals, findCandidate, findSeat, formatShort, loadResults, marginOf, marginRank, marginsInState, ordinal, requireResults, searchSeats, seatHistory, seatHref, seatWinner, statesOf, summaryOf, validateResults, type ResultSeat } from "./lok-sabha";

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
  assert.equal(seatHref(history[0].seat, "lok-sabha-2024"), "/seats/rajasthan/jaipur");
  assert.equal(seatHref(history[1].seat, "lok-sabha-2019"), "/elections/lok-sabha-2019/rajasthan/jaipur");
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

test("2024 seats load with every seat and a winner, including unopposed Surat", () => {
  assert.equal(requireResults("lok-sabha-2024").seats.length, 543);
  const surat = findSeat("lok-sabha-2024", "gujarat", "surat");
  assert.ok(surat?.unopposed);
  assert.equal(surat.candidates.length, 0);
  const jaipur = findSeat("lok-sabha-2024", "rajasthan", "jaipur");
  assert.equal(jaipur?.number, 7);
  assert.equal(jaipur?.candidates[0].votes, 886850);
  assert.throws(() => requireResults("lok-sabha-1999" as never), /not published/);
});

test("margins compare the winner with the runner-up and others with the winner", () => {
  const { seat, candidate } = findCandidate("lok-sabha-2024", "rajasthan", "jaipur", "manju-sharma")!;
  assert.deepEqual(marginOf(seat, candidate), { kind: "won", votes: 886850 - 555083, other: seat.candidates[1] });
  const second = findCandidate("lok-sabha-2024", "rajasthan", "jaipur", "pratap-singh-khachariyawas")!;
  assert.equal(marginOf(second.seat, second.candidate)?.kind, "behind");
  assert.deepEqual(marginRank(jaipurSeat()), { rank: 5, total: 25 });
  assert.equal(marginRank(findSeat("lok-sabha-2024", "gujarat", "surat")!), null);
});

const jaipurSeat = () => findSeat("lok-sabha-2024", "rajasthan", "jaipur")!;

test("search covers every election and groups a seat's years", () => {
  const jaipur = searchSeats("jaipur")[0];
  assert.equal(jaipur.seat.name, "Jaipur");
  assert.deepEqual(jaipur.years, ["lok-sabha-2024", "lok-sabha-2019", "lok-sabha-2014"]);
  assert.ok(searchSeats("rajasthan").length >= 25);
  const bohra = searchSeats("ramcharan bohra");
  assert.equal(bohra[0].seat.slug, "jaipur");
  assert.equal(bohra[0].id, "lok-sabha-2024", "links to the newest version of the seat");
  assert.deepEqual(bohra[0].people.map((person) => person.id), ["lok-sabha-2019"]);
  assert.ok(searchSeats("manju sharma").some((match) => match.seat.slug === "jaipur" && match.people.some((p) => p.candidate.slug === "manju-sharma")));
  assert.ok(searchSeats("mukeshkumar dalal").some((match) => match.seat.slug === "surat"));
  assert.ok(searchSeats("bhartruhari").some((match) => match.seat.slug === "cuttack"), "winner-only 2014 seats are searchable too");
  assert.deepEqual(searchSeats("   "), []);
});

test("short numbers and summaries read plainly", () => {
  assert.equal(formatShort(372032), "3.72 lakh");
  assert.equal(formatShort(87412345), "8.74 crore");
  assert.equal(formatShort(100000), "1 lakh");
  assert.equal(formatShort(5378), "5,378");
  const party = (code: string) => requireResults("lok-sabha-2024").parties[code].name;
  const won = findCandidate("lok-sabha-2024", "rajasthan", "jaipur", "manju-sharma")!;
  assert.equal(summaryOf(won.seat, won.candidate, party), "Got 8.87 lakh votes (61% of valid votes) in Jaipur. Won by 3.32 lakh votes over Pratap Singh Khachariyawas (Indian National Congress).");
  const lost = findCandidate("lok-sabha-2024", "rajasthan", "jaipur", "pratap-singh-khachariyawas")!;
  assert.match(summaryOf(lost.seat, lost.candidate, party), /^Got 5\.55 lakh votes \(38% of valid votes\) in Jaipur\. Finished 2 of 13, 3\.32 lakh votes behind the winner, Manju Sharma \(Bharatiya Janata Party\)\.$/);
});
