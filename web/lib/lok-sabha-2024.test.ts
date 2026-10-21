import assert from "node:assert/strict";
import test from "node:test";

import { getCandidate, getSeat, loadLokSabha2024, marginOf, searchSeats } from "./lok-sabha-2024";

test("national 2024 results load with every seat and a winner", () => {
  const data = loadLokSabha2024();
  assert.equal(data.seats.length, 543);
  const surat = getSeat("gujarat", "surat");
  assert.ok(surat?.unopposed);
  assert.equal(surat.candidates.length, 0);
  const jaipur = getSeat("rajasthan", "jaipur");
  assert.equal(jaipur?.number, 7);
  assert.equal(jaipur?.candidates[0].name, "Manju Sharma");
  assert.equal(jaipur?.candidates[0].votes, 886850);
});

test("margins compare the winner with the runner-up and others with the winner", () => {
  const { seat, candidate } = getCandidate("rajasthan", "jaipur", "manju-sharma")!;
  assert.deepEqual(marginOf(seat, candidate), { kind: "won", votes: 886850 - 555083, other: seat.candidates[1] });
  const second = getCandidate("rajasthan", "jaipur", "pratap-singh-khachariyawas")!;
  assert.equal(marginOf(second.seat, second.candidate)?.kind, "behind");
});

test("search finds seats by name or state and people by name", () => {
  assert.equal(searchSeats("jaipur")[0].seat.name, "Jaipur");
  assert.ok(searchSeats("rajasthan").length >= 25);
  const byPerson = searchSeats("manju sharma");
  assert.ok(byPerson.some((match) => match.seat.slug === "jaipur" && match.matchedCandidate?.slug === "manju-sharma"));
  assert.ok(searchSeats("mukeshkumar dalal").some((match) => match.seat.slug === "surat"));
  assert.deepEqual(searchSeats("   "), []);
});
