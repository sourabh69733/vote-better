import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

import { CivicReview } from "../src/review.js";
import { migrate } from "../src/migrate.js";
import { CivicStore } from "../src/store.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
const store = new CivicStore(pool);
const review = new CivicReview(pool);
before(async () => { await migrate(pool); });
after(async () => { await pool.end(); });

async function saved(predicate: string, value: string | number) {
  const url = `https://example.org/${randomUUID()}.pdf`;
  const source = await store.saveSource({ authority: "Test authority", url, documentType: "result" });
  const snapshot = await store.saveSnapshot(source.id, url, `sha256:${randomUUID().replaceAll("-", "").padEnd(64, "0")}`, new Date().toISOString());
  const [item] = await store.saveObservations(snapshot.id, [{ locator: "page 1, candidate row 1, name", predicate,
    rawValue: String(value), normalizedValue: value, normalizedAt: new Date().toISOString(), normalizerVersion: "test-v1" }]);
  return item;
}

test("review needs an explicit person link and preserves rejected history", async () => {
  const item = await saved("candidate.name", "A Sharma");
  const [queued] = await review.queueForReview([item.id]);
  assert.equal(queued.state, "identity-unresolved");
  await assert.rejects(() => review.approve(queued.id, "reviewer-1", "Checked PDF"), /identity/i);
  await store.recordDecision([item.id], "approved", "direct-reviewer", "Bypass attempt");
  assert.ok(!(await store.listPublicationCandidates()).some((row) => row.id === item.id));
  const rejected = await review.decide(queued.id, "rejected", "reviewer-1", "Name transcription is wrong");
  assert.equal(rejected.decision, "rejected");
  assert.ok(!(await store.listPublicationCandidates()).some((row) => row.id === item.id));
  const history = await review.history(item.id);
  assert.equal(history.at(-1)?.decision, "rejected");
});

test("confirmed identity permits approval but a changed published value is blocked", async () => {
  const item = await saved("candidate.votesPolled", 101);
  const person = await pool.query("INSERT INTO person (stable_key, display_name) VALUES ($1, $2) RETURNING id", [`test-${randomUUID()}`, "A Sharma"]);
  const entityId = person.rows[0].id as string;
  const [queued] = await review.queueForReview([item.id]);
  await review.confirmIdentity(item.id, entityId, "reviewer-1", "Checked official contest record");
  const approved = await review.approve(queued.id, "reviewer-1", "Checked PDF votes row");
  assert.equal(approved.decision, "approved");
  assert.ok((await store.listPublicationCandidates()).some((row) => row.id === item.id));

  const [older] = await store.saveObservations(item.snapshotId, [{
    locator: "page 1, earlier return, votes", predicate: item.predicate,
    rawValue: "100", normalizedValue: 100,
    normalizedAt: new Date().toISOString(), normalizerVersion: "test-v0",
  }]);
  const revision = await pool.query("INSERT INTO publication_revision DEFAULT VALUES RETURNING id, published_at");
  const prior = await pool.query("INSERT INTO approved_fact (entity_id, predicate, value, revision_id, published_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [entityId, item.predicate, JSON.stringify(100), revision.rows[0].id, revision.rows[0].published_at]);
  await pool.query("INSERT INTO fact_observation (fact_id, observation_id) VALUES ($1, $2)", [prior.rows[0].id, older.id]);
  const [conflict] = await review.queueForReview([item.id]);
  assert.equal(conflict.state, "conflict");
  assert.deepEqual(conflict.previousValue, 100);
  await assert.rejects(() => review.approve(conflict.id, "reviewer-1", "Checked again"), /conflict/i);
  assert.ok(!(await store.listPublicationCandidates()).some((row) => row.id === item.id));
});
