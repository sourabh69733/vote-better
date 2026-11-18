import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BYE_ELECTION_TRANSCRIPTIONS } from "../src/import-rajasthan-bye-elections.js";
import { checkTranscriptions, normalizeDeclaration, normalizeReturn, type Transcriptions } from "../src/normalize/rajasthan-form21e-transcription.js";
import { approveSnapshotBatch } from "../src/review-batch.js";

const load = async (): Promise<Transcriptions> => JSON.parse(await readFile(BYE_ELECTION_TRANSCRIPTIONS, "utf8"));
const at = "2026-11-01T00:00:00.000Z";

test("the transcribed bye-election returns pass every check", async () => {
  const input = checkTranscriptions(await load());
  assert.equal(input.returns.length, 8);
  assert.deepEqual(input.returns.map((item) => item.constituency.number), [27, 67, 88, 97, 110, 156, 161, 193]);
  assert.equal(input.declarations[0].constituency.number, 165);
});

test("a wrong number or a wrong winner is caught before anyone reviews it", async () => {
  const sum = await load();
  sum.returns[0].candidates[1].votes += 10;
  assert.throws(() => checkTranscriptions(sum), /add up to/);
  const winner = await load();
  winner.returns[0].elected.row = 1;
  assert.throws(() => checkTranscriptions(winner), /declared winner/);
});

test("namesakes in one seat get separate people, and the winner is the one with most votes", async () => {
  const chorasi = (await load()).returns.find((item) => item.constituency.number === 161)!;
  const drafts = normalizeReturn(chorasi, at).map((draft) => draft.normalizedValue as Record<string, unknown>);
  const katara = drafts.filter((value) => value.name === "Anil Kumar Katara");
  assert.equal(katara.length, 2);
  assert.notEqual(katara[0].personKey, katara[1].personKey);
  assert.deepEqual(drafts.find((value) => value.rank === 1)?.party, "Bharat Adivasi Party");
  assert.deepEqual((drafts[0].contest as Record<string, number>).votesPolled, 186990 + 3144 + 39);
});

test("a gazette declaration gives the winner with no vote counts", async () => {
  const [draft] = normalizeDeclaration((await load()).declarations[0], at);
  assert.equal(draft.locator, "page 1, declaration");
  assert.deepEqual(draft.normalizedValue, {
    election: "rajasthan-bye-election-bagidora-2024", personKey: "rajasthan-bye-election-bagidora-2024/rajasthan/165-bagidora/jaikrishna-patel",
    state: "Rajasthan", constituency: "Bagidora", seatNumber: 165, name: "Jaikrishna Patel", party: "Bharat Adivasi Party",
    rank: 1, declaredOnly: true, votes: null, contest: null,
  });
});

test("only a named person who compared the document can approve a transcription", async () => {
  const pool = {} as never;
  await assert.rejects(approveSnapshotBatch(pool, "https://example.org", "automated-batch-check", "x", { transcription: true, comparedWithDocument: true }), /a person must review/);
  await assert.rejects(approveSnapshotBatch(pool, "https://example.org", "reviewer@example.org", "x", { transcription: true }), /compared-with-document/);
});
