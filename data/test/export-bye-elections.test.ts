import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildByElectionBundle, partyCodeOf, readBaseSeats } from "../src/export-bye-elections.js";
import { BYE_ELECTION_TRANSCRIPTIONS } from "../src/import-rajasthan-bye-elections.js";
import { normalizeDeclaration, normalizeReturn, type Transcriptions } from "../src/normalize/rajasthan-form21e-transcription.js";
import type { Publication } from "../src/publish.js";

const parties = new Map([
  ["BJP", { name: "Bharatiya Janata Party", type: "National Party" }], ["INC", { name: "Indian National Congress", type: "National Party" }],
  ["BHRTADVSIP", { name: "Bharat Adivasi Party", type: "Registered (Unrecognised) Party" }],
]);

// What publish.ts would hand back once a reviewer approved these drafts.
async function approved(electionId: string): Promise<Publication> {
  const input = JSON.parse(await readFile(BYE_ELECTION_TRANSCRIPTIONS, "utf8")) as Transcriptions;
  const at = "2026-11-01T00:00:00.000Z";
  const drafts = [...input.returns.filter((r) => r.electionId === electionId).flatMap((r) => normalizeReturn(r, at).map((d) => ({ d, url: r.sourceUrl }))),
    ...input.declarations.filter((r) => r.electionId === electionId).flatMap((r) => normalizeDeclaration(r, at).map((d) => ({ d, url: r.sourceUrl })))];
  return {
    revisionId: "rev", previousRevisionId: null, publishedAt: at, coverage: "not-assessed", dataset: { candidacies: [] },
    facts: drafts.map(({ d, url }, index) => ({
      id: `fact-${index}`, subjectId: `person-${index}`, predicate: d.predicate, value: d.normalizedValue, revisionId: "rev", publishedAt: at, reviewedAt: at,
      reviewMethod: "recorded-reviewer-decision" as const,
      source: { url, contentHash: "sha256:x", capturedAt: at, locator: d.locator, normalizerVersion: d.normalizerVersion, normalizedAt: at, recordedAt: at },
    })),
  };
}

test("party names map to ECI abbreviations, independents to IND", () => {
  const code = partyCodeOf(parties);
  assert.equal(code("Bharatiya Janata Party"), "BJP");
  assert.equal(code("Independent"), "IND");
  assert.equal(code("Rashtriya Mangalam Party"), "Rashtriya Mangalam Party");
});

test("approved returns become a results file on the 2023 seats, with their Lok Sabha seats", async () => {
  const bundle = buildByElectionBundle("rajasthan-bye-elections-november-2024", "November 2024", [await approved("rajasthan-bye-elections-november-2024")], parties, await readBaseSeats(), [])!;
  assert.equal(bundle.seats.length, 7);
  const jhunjhunu = bundle.seats.find((seat) => seat.number === 27)!;
  assert.equal(jhunjhunu.slug, "27-jhunjhunu");
  assert.equal(jhunjhunu.parliament?.slug, "jhunjhunu");
  assert.deepEqual([jhunjhunu.candidates[0].name, jhunjhunu.candidates[0].party, jhunjhunu.candidates[0].votes], ["Rajendra Bhamboo", "BJP", 90425]);
  assert.equal(jhunjhunu.candidates[0].locator, "page 1, candidate row 2");
  assert.equal(bundle.seats.find((seat) => seat.number === 161)!.candidates[0].party, "BHRTADVSIP");
});

test("a gazette-only result becomes a winner with no margin, and an unapproved round gives no file", async () => {
  const bagidora = buildByElectionBundle("rajasthan-bye-election-bagidora-2024", "Bagidora", [await approved("rajasthan-bye-election-bagidora-2024")], parties, await readBaseSeats(), [])!;
  assert.deepEqual(bagidora.seats[0].winnerOnly, { winner: "Jaikrishna Patel", party: "BHRTADVSIP", margin: null });
  assert.equal(bagidora.seats[0].candidates.length, 0);
  assert.equal(buildByElectionBundle("rajasthan-bye-election-anta-2025", "Anta", [], parties, await readBaseSeats(), []), null);
});
