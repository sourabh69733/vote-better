import assert from "node:assert/strict";
import test from "node:test";

import { candidateGroups, findNominationSeat, loadNominations, nominationElectionIds, nominationSeatHref, validateNominations } from "./nominations";

test("the October 2026 bye-election candidate lists load and pass validation", () => {
  assert.ok(nominationElectionIds().includes("bye-elections-october-2026"));
  const nominations = loadNominations("bye-elections-october-2026");
  assert.ok(nominations);
  assert.equal(nominations.seats.length, 6);
  const seat = findNominationSeat("bye-elections-october-2026", "puducherry", "thattanchavady");
  assert.ok(seat);
  assert.equal(nominationSeatHref("bye-elections-october-2026", seat), "/elections/bye-elections-october-2026/puducherry/thattanchavady");
  const { ballot, out } = candidateGroups(seat);
  assert.deepEqual(ballot.map((candidate) => candidate.ballot), ballot.map((_, index) => index + 1));
  assert.equal(ballot.length + out.length, seat.candidates.length);
  assert.equal(loadNominations("not-an-election"), undefined);
  assert.equal(loadNominations("../generated/jaipur"), undefined);
});

test("validation rejects a list with a gap in the ballot numbers", () => {
  const broken = structuredClone(loadNominations("bye-elections-october-2026")!);
  broken.seats[0].candidates[1].ballot = 9;
  assert.throws(() => validateNominations(broken, "bye-elections-october-2026"), /ballot numbers/);
  assert.throws(() => validateNominations(broken, "another-election"), /not for another-election/);
});
