import assert from "node:assert/strict";
import test from "node:test";

import { crossCheckWinners, type SeatSummary } from "../src/normalize/eci-ge2024-reference.js";

const seat: SeatSummary = {
  state: "Kerala", number: 3, constituency: "Vadakara", reservation: "GEN", validVotes: 1000,
  winner: { name: "SHAFI PARAMBIL", party: "INC", votes: 600 },
  runnerUp: { name: "K K SHAILAJA TEACHER", party: "CPI(M)", votes: 400 }, margin: 200, excelRow: 5,
};
const results = [
  { state: "Kerala", constituency: "VADAKARA", rank: 1, name: "SHAFI PARAMBIL", party: "INC", votes: 600, validVotes: 1000 },
  { state: "Kerala", constituency: "VADAKARA", rank: 2, name: "K.K. SHAILAJA TEACHER", party: "CPI(M)", votes: 400, validVotes: 1000 },
];

test("winner cross-check lists runner-up spellings but requires matching votes and parties", () => {
  assert.deepEqual(crossCheckWinners([seat], results).nameVariants, ['Vadakara, Kerala: "K.K. SHAILAJA TEACHER" / "K K SHAILAJA TEACHER"']);
  assert.throws(() => crossCheckWinners([{ ...seat, winner: { ...seat.winner, votes: 601 } }], results), /winner differs/);
  assert.throws(() => crossCheckWinners([{ ...seat, runnerUp: { ...seat.runnerUp, party: "CPI" } }], results), /runner-up differs/);
  assert.throws(() => crossCheckWinners([seat, { ...seat, constituency: "Kannur" }], results), /2 seats/);
});
