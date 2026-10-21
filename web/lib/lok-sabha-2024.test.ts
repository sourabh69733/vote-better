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

test("short numbers and summaries read plainly", async () => {
  const { formatShort, summaryOf } = await import("./lok-sabha-2024");
  assert.equal(formatShort(372032), "3.72 lakh");
  assert.equal(formatShort(87412345), "8.74 crore");
  assert.equal(formatShort(100000), "1 lakh");
  assert.equal(formatShort(5378), "5,378");
  const party = (code: string) => loadLokSabha2024().parties[code].name;
  const won = getCandidate("rajasthan", "jaipur", "manju-sharma")!;
  assert.equal(summaryOf(won.seat, won.candidate, party), "Got 8.87 lakh votes (61% of valid votes) in Jaipur. Won by 3.32 lakh votes over Pratap Singh Khachariyawas (Indian National Congress).");
  const lost = getCandidate("rajasthan", "jaipur", "pratap-singh-khachariyawas")!;
  assert.match(summaryOf(lost.seat, lost.candidate, party), /^Got 5\.55 lakh votes \(38% of valid votes\) in Jaipur\. Finished 2 of 13, 3\.32 lakh votes behind the winner, Manju Sharma \(Bharatiya Janata Party\)\.$/);
});
