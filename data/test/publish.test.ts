import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

import { migrate } from "../src/migrate.js";
import { publishApproved, resolvePublicationConflict } from "../src/publish.js";
import { CivicReview } from "../src/review.js";
import { CivicStore } from "../src/store.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
const store = new CivicStore(pool);
before(async () => { await migrate(pool); });
after(async () => { await pool.end(); });

async function fixture(value: number) {
  const url = `https://example.org/${randomUUID()}.pdf`;
  const source = await store.saveSource({ authority: "Test election authority", url, documentType: "Form 21E" });
  const hash = createHash("sha256").update(randomUUID()).digest("hex");
  const snapshot = await store.saveSnapshot(source.id, url, `sha256:${hash}`, new Date().toISOString());
  const [observation] = await store.saveObservations(snapshot.id, [{
    locator: "page 1, candidate row 2, votes", predicate: "candidate.votesPolled",
    rawValue: String(value), normalizedValue: value,
    validFrom: { value: "2024-06-04", precision: "day", originalText: "04/06/2024" },
    normalizedAt: new Date().toISOString(), normalizerVersion: "test-v1",
  }]);
  const stableKey = `test-${randomUUID()}`;
  const person = await pool.query("INSERT INTO person (stable_key, display_name) VALUES ($1, $2) RETURNING id", [stableKey, "Test Person"]);
  const entityId = person.rows[0].id as string;
  await pool.query("INSERT INTO entity_match (observation_id, entity_id, status, reason, reviewer_id) VALUES ($1, $2, 'confirmed', $3, $4)",
    [observation.id, entityId, "Verified identity", "reviewer-test"]);
  return { url, observation, entityId, stableKey };
}

test("an unapproved observation cannot create a publication revision", async () => {
  const { url, observation } = await fixture(123);
  await assert.rejects(() => publishApproved(pool, url, [observation.id]), /approved/i);
  const result = await pool.query("SELECT 1 FROM fact_observation WHERE observation_id = $1", [observation.id]);
  assert.equal(result.rowCount, 0);
});

test("a published fact carries its complete public source trail", async () => {
  const { url, observation, stableKey } = await fixture(456);
  await store.recordDecision([observation.id], "approved", "reviewer-test", "Checked return row");
  const output = await publishApproved(pool, url, [observation.id]);
  assert.equal(output.facts.length, 1);
  const fact = output.facts[0];
  assert.equal(fact.subjectId, stableKey);
  assert.equal(fact.value, 456);
  assert.equal(fact.source.url, url);
  assert.equal(fact.source.locator, "page 1, candidate row 2, votes");
  assert.equal(fact.source.validFrom?.precision, "day");
  assert.match(fact.source.contentHash, /^sha256:/);
  assert.match(fact.reviewedAt, /Z$/);
  assert.equal(fact.reviewMethod, "recorded-reviewer-decision");
  assert.equal(fact.publishedAt, output.publishedAt);
  assert.equal(fact.revisionId, output.revisionId);
  await assert.rejects(() => publishApproved(pool, url, [observation.id]), /already published/i);
});

test("a correction retains the previous fact and its timestamps", async () => {
  const first = await fixture(100);
  await store.recordDecision([first.observation.id], "approved", "reviewer-test", "Checked first return");
  const original = await publishApproved(pool, first.url, [first.observation.id]);

  const source = await store.saveSource({ authority: "Test election authority", url: first.url, documentType: "Form 21E" });
  const hash = createHash("sha256").update(randomUUID()).digest("hex");
  const snapshot = await store.saveSnapshot(source.id, first.url, `sha256:${hash}`, new Date().toISOString());
  const [corrected] = await store.saveObservations(snapshot.id, [{
    locator: "page 1, candidate row 2, votes", predicate: "candidate.votesPolled",
    rawValue: "101", normalizedValue: 101,
    validFrom: { value: "2024-06-04", precision: "day", originalText: "04/06/2024" },
    normalizedAt: new Date().toISOString(), normalizerVersion: "test-v2",
  }]);
  await pool.query("INSERT INTO entity_match (observation_id, entity_id, status, reason, reviewer_id) VALUES ($1, $2, 'confirmed', $3, $4)",
    [corrected.id, first.entityId, "Same person", "reviewer-test"]);
  const review = new CivicReview(pool);
  await assert.rejects(() => review.approve(corrected.id, "reviewer-test", "Checked corrected return"), /conflict/i);
  await assert.rejects(() => publishApproved(pool, first.url, [corrected.id]), /not approved/i);
  await resolvePublicationConflict(pool, corrected.id, original.facts[0].id, "reviewer-test", "Verified corrected return against source");
  await review.approve(corrected.id, "reviewer-test", "Checked corrected return");
  const revised = await publishApproved(pool, first.url, [corrected.id]);
  assert.equal(revised.facts[0].priorFactId, original.facts[0].id);
  assert.equal(revised.previousRevisionId, original.revisionId);
  assert.notEqual(revised.facts[0].publishedAt, original.facts[0].publishedAt);
  const previous = await pool.query("SELECT id, published_at FROM approved_fact WHERE id = $1", [original.facts[0].id]);
  assert.equal(previous.rowCount, 1);
  assert.equal((previous.rows[0].published_at as Date).toISOString(), original.publishedAt);
});

test("a different election source can record a new result for the same person", async () => {
  const first = await fixture(100);
  await store.recordDecision([first.observation.id], "approved", "reviewer-test", "Checked first election");
  await publishApproved(pool, first.url, [first.observation.id]);

  const second = await fixture(200);
  await pool.query("INSERT INTO entity_match (observation_id, entity_id, status, reason, reviewer_id) VALUES ($1, $2, 'confirmed', $3, $4)",
    [second.observation.id, first.entityId, "Same person, different election", "reviewer-test"]);
  const review = new CivicReview(pool);
  const [caseItem] = await review.queueForReview([second.observation.id]);
  assert.equal(caseItem.state, "ready");
  await review.approve(second.observation.id, "reviewer-test", "Checked second election");
  const published = await publishApproved(pool, second.url, [second.observation.id]);
  assert.equal(published.facts[0].value, 200);
  assert.equal(published.facts[0].priorFactId, undefined);
});
