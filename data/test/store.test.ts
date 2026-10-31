import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { createTestPool, prepareTestDatabase } from "./db.js";
import { CivicStore, type ObservationDraft } from "../src/store.js";

const pool = createTestPool();
const store = new CivicStore(pool);

before(async () => { await prepareTestDatabase(pool); });
after(async () => { await pool.end(); });

function draft(locator: string, value: number): ObservationDraft {
  return {
    locator,
    predicate: "candidate.votesPolled",
    rawValue: String(value),
    normalizedValue: value,
    validFrom: { value: "2024-06-04", precision: "day", originalText: "04/06/2024" },
    normalizedAt: new Date().toISOString(),
    normalizerVersion: "form21e-v1",
  };
}

async function sourceAndSnapshot() {
  const source = await store.saveSource({
    authority: "Rajasthan CEO", url: `https://example.org/${randomUUID()}.pdf`, documentType: "Form 21E",
  });
  const hash = createHash("sha256").update(randomUUID()).digest("hex");
  const snapshot = await store.saveSnapshot(source.id, source.url, `sha256:${hash}`, new Date().toISOString());
  return { source, snapshot };
}

test("a duplicate source and identical content keep one snapshot with database timestamps", async () => {
  const url = `https://example.org/${randomUUID()}.pdf`;
  const source = await store.saveSource({ authority: "Rajasthan CEO", url, documentType: "Form 21E" });
  const sameSource = await store.saveSource({ authority: "Rajasthan CEO", url, documentType: "Form 21E" });
  assert.equal(sameSource.id, source.id);
  const capturedAt = "2024-06-06T10:00:00.000Z";
  const hash = `sha256:${"a".repeat(64)}`;
  const first = await store.saveSnapshot(source.id, url, hash, capturedAt);
  const second = await store.saveSnapshot(source.id, url, hash, "2026-10-05T10:00:00.000Z");
  assert.equal(second.id, first.id);
  assert.equal(second.capturedAt, capturedAt);
  assert.match(first.recordedAt, /^\d{4}-\d\d-\d\dT.*\.\d{3}Z$/);
  assert.notEqual(first.recordedAt, capturedAt);
  await assert.rejects(() => store.saveSnapshot(randomUUID(), url, `sha256:${"b".repeat(64)}`, capturedAt));
  await assert.rejects(() => store.saveSnapshot(source.id, url, "not-a-hash", capturedAt));
});

test("collection attempts require an exact UTC attempt time", async () => {
  const source = await store.saveSource({
    authority: "Rajasthan CEO", url: `https://example.org/${randomUUID()}.pdf`, documentType: "Form 21E",
  });
  await assert.rejects(() => store.recordCollectionAttempt({
    sourceId: source.id, attemptedAt: "2026-10-05", outcome: "unavailable",
  }));
  const attempt = await store.recordCollectionAttempt({
    sourceId: source.id, attemptedAt: new Date().toISOString(), outcome: "unavailable",
  });
  assert.match(attempt.recordedAt, /Z$/);
});

test("observation batches are atomic and repeated rows do not create drafts", async () => {
  const { snapshot } = await sourceAndSnapshot();
  const first = await store.saveObservations(snapshot.id, [draft("page 1 row 1", 100)]);
  const repeated = await store.saveObservations(snapshot.id, [draft("page 1 row 1", 100)]);
  assert.deepEqual(repeated.map((item) => item.id), first.map((item) => item.id));

  await assert.rejects(() => store.saveObservations(snapshot.id, [
    draft("page 1 row 2", 200),
    draft("page 1 row 1", 999),
  ]));
  const result = await pool.query("SELECT count(*)::integer AS count FROM observation WHERE snapshot_id = $1", [snapshot.id]);
  assert.equal(result.rows[0].count, 1);
  const retried = await store.saveObservations(snapshot.id, [draft("page 1 row 2", 200)]);
  assert.equal(retried.length, 1);
  assert.equal(first[0].validFrom?.precision, "day");
  assert.match(first[0].recordedAt, /Z$/);
});

test("repeat imports accept equivalent JSON objects with different key order", async () => {
  const { snapshot } = await sourceAndSnapshot();
  const first = await store.saveObservations(snapshot.id, [
    { ...draft("page 1 totals", 0), normalizedValue: { valid: 10, nota: 2 } },
  ]);
  const second = await store.saveObservations(snapshot.id, [
    { ...draft("page 1 totals", 0), normalizedValue: { nota: 2, valid: 10 } },
  ]);
  assert.equal(second[0].id, first[0].id);
});

test("review decisions are immutable and only the latest approved observation is a candidate", async () => {
  const { snapshot } = await sourceAndSnapshot();
  const [observation] = await store.saveObservations(snapshot.id, [draft("page 1 row 2", 886850)]);
  const person = await pool.query("INSERT INTO person (stable_key, display_name) VALUES ($1, $2) RETURNING id", [`test-${randomUUID()}`, "Test person"]);
  await pool.query("INSERT INTO entity_match (observation_id, entity_id, status, reason, reviewer_id) VALUES ($1, $2, 'confirmed', $3, $4)",
    [observation.id, person.rows[0].id, "Test identity", "reviewer-1"]);
  const approved = await store.recordDecision([observation.id], "approved", "reviewer-1", "Checked page 1");
  assert.match(approved.reviewedAt, /Z$/);
  assert.match(approved.recordedAt, /Z$/);
  assert.ok((await store.listPublicationCandidates()).some((item) => item.id === observation.id));
  await assert.rejects(() => pool.query("UPDATE review_event SET reason = 'changed' WHERE id = $1", [approved.id]));
  await store.recordDecision([observation.id], "rejected", "reviewer-2", "Disputed transcription");
  assert.ok(!(await store.listPublicationCandidates()).some((item) => item.id === observation.id));
  const history = await pool.query("SELECT count(*)::integer AS count FROM review_event WHERE id IN (SELECT review_id FROM review_observation WHERE observation_id = $1)", [observation.id]);
  assert.equal(history.rows[0].count, 2);
});
