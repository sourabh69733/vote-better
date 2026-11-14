import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { findAdrCandidate, findAdrWinner, readAdrWinners, type AdrWinner } from "./adr-winners";

const winner = (name: string, constituency: string): AdrWinner => ({
  state: "Rajasthan", constituency, name, party: "BJP", byElection: false, education: "Graduate", age: 50, cases: 0,
  assets: 100, liabilities: 0, figuresFrom: "both", sourceUrl: "https://www.myneta.info/LokSabha2024/",
});

test("reads a private export, and treats a missing or wrong file as no data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vote-better-adr-"));
  const file = join(directory, "winners.json");
  assert.equal(await readAdrWinners(file), null);
  await writeFile(file, JSON.stringify({ schemaVersion: 1, sourceLabel: "ADR/MyNeta", checkedOn: "2026-11-02", winners: [winner("Asha Rao", "Testpur")] }));
  assert.equal((await readAdrWinners(file))?.winners.length, 1);
  await writeFile(file, JSON.stringify({ schemaVersion: 2, sourceLabel: "ADR/MyNeta", winners: [] }));
  assert.equal(await readAdrWinners(file), null);
});

test("shows a winner's figures only when both seat and name match", () => {
  const winners = [winner("Asha Rao", "Testpur"), winner("Ravi Sen", "Otherpur")];
  const mp = { memberId: 999999, name: "Smt. Asha Rao", state: "Rajasthan", constituency: "Testpur" };
  assert.equal(findAdrWinner(winners, mp)?.name, "Asha Rao");
  assert.equal(findAdrWinner(winners, { ...mp, name: "Someone Else" }), undefined);
  assert.equal(findAdrWinner(winners, { ...mp, constituency: "Otherpur" }), undefined);
});

test("shows nothing when two rows could be the same person", () => {
  const mp = { memberId: 999999, name: "Asha Rao", state: "Rajasthan", constituency: "Testpur" };
  assert.equal(findAdrWinner([winner("Asha Rao", "Testpur"), winner("Asha Rao", "Testpur")], mp), undefined);
});

test("takes a differently spelled row only for an MP linked to the seat as its 2024 winner", () => {
  const jaipur = { ...winner("M. Sharma Spelled Differently", "Jaipur") };
  const sitting = { memberId: 5619, name: "Smt. Manju Sharma", state: "Rajasthan", constituency: "Jaipur" };
  assert.equal(findAdrWinner([jaipur], sitting)?.name, "M. Sharma Spelled Differently");
  // A by-election winner must not take the row of the general-election winner they replaced.
  const replaced = { memberId: 5836, name: "Smt. Priyanka Gandhi Vadra", state: "Kerala", constituency: "Wayanad" };
  assert.equal(findAdrWinner([{ ...winner("Rahul Gandhi", "Wayanad"), state: "Kerala" }], replaced), undefined);
});

test("a candidate takes an ADR row only when the match is one to one within the seat", () => {
  const row = (name: string, constituency = "Jaipur", state = "Rajasthan"): AdrWinner => ({ ...winner(name, constituency), state });
  const seat = (names: string[], name = "Jaipur", state = "Rajasthan") => ({ state, name, sourceName: name.toUpperCase(), candidates: names.map((n) => ({ slug: n.toLowerCase().replace(/\s+/g, "-"), name: n })) });
  const jaipur = seat(["Asha Devi", "Bina Kumari"]);
  assert.equal(findAdrCandidate([row("Asha Devi"), row("Bina Kumari")], jaipur, jaipur.candidates[0])?.name, "Asha Devi");
  assert.equal(findAdrCandidate([row("Asha Devi", "Kota")], jaipur, jaipur.candidates[0]), undefined, "another seat's row is not used");
  const namesakes = seat(["Ram Kumar", "Ram Kumar Singh"]);
  assert.equal(findAdrCandidate([row("Ram Kumar Singh")], namesakes, namesakes.candidates[1]), undefined, "a row two candidates could be is not used");
  const delhi = seat(["Asha Devi"], "Chandni Chowk", "NCT OF Delhi");
  assert.equal(findAdrCandidate([row("Asha Devi", "Chandni Chowk", "Delhi")], delhi, delhi.candidates[0])?.name, "Asha Devi", "reviewed state spelling");
});
