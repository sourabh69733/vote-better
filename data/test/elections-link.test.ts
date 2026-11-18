import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { contestKey, linkElections, seatKey, seatName } from "../src/elections/link.js";
import { loadCalendar } from "../src/export-elections.js";
import { createTestPool, prepareTestDatabase } from "./db.js";

const pool = createTestPool();
before(async () => { await prepareTestDatabase(pool); });
after(async () => { await pool.end(); });

// Publishes one candidate.result fact per row, the way batch review and publish leave them.
async function publishResults(url: string, rows: { state: string; constituency: string; name: string; seatNumber?: number }[]) {
  const source = await pool.query("INSERT INTO source (authority, url, document_type) VALUES ('Test', $1, 'test') RETURNING id", [url]);
  const snapshot = await pool.query("INSERT INTO snapshot (source_id, url, content_hash, captured_at) VALUES ($1, $2, $3, now()) RETURNING id", [source.rows[0].id, url, `sha256:${randomUUID()}`]);
  const revision = await pool.query("INSERT INTO publication_revision DEFAULT VALUES RETURNING id");
  for (const [index, row] of rows.entries()) {
    const value = { state: row.state, constituency: row.constituency, name: row.name, ...(row.seatNumber ? { seatNumber: row.seatNumber } : {}) };
    const person = await pool.query("INSERT INTO person (stable_key, display_name) VALUES ($1, $2) RETURNING id", [`test-${randomUUID()}`, row.name]);
    const observation = await pool.query(`
      INSERT INTO observation (snapshot_id, locator, predicate, raw_value, normalized_value, normalized_at, normalizer_version)
      VALUES ($1, $2, 'candidate.result', '', $3, now(), 'test') RETURNING id`, [snapshot.rows[0].id, `Worksheet, row ${index + 4}`, value]);
    const fact = await pool.query("INSERT INTO approved_fact (entity_id, predicate, value, revision_id, published_at) VALUES ($1, 'candidate.result', $2, $3, now()) RETURNING id", [person.rows[0].id, value, revision.rows[0].id]);
    await pool.query("INSERT INTO fact_observation (fact_id, observation_id) VALUES ($1, $2)", [fact.rows[0].id, observation.rows[0].id]);
  }
}

test("seat names lose the reservation suffix older files add, and nothing else", () => {
  assert.equal(seatName("Gaya (SC)"), "Gaya");
  assert.equal(seatName("Ranchi"), "Ranchi");
  assert.equal(seatKey("Bihar", "GAYA (SC)"), seatKey("Bihar", "Gaya"));
  assert.notEqual(seatKey("Bihar", "Gaya"), seatKey("Jharkhand", "Gaya"));
  assert.equal(contestKey("lok-sabha-2019", "Bihar", "Gaya (SC)"), "lok-sabha-2019/bihar/gaya");
  assert.equal(seatKey("Rajasthan", "Shahpura", "assembly-seat", 42), "assembly-seat/rajasthan/42-shahpura");
  assert.notEqual(seatKey("Rajasthan", "Shahpura", "assembly-seat", 42), seatKey("Rajasthan", "Shahpura (SC)", "assembly-seat", 181));
});

test("results become elections, contests and candidacies, matched across elections by state and seat", async () => {
  const tag = randomUUID().slice(0, 8);
  const newer = `test-ls-new-${tag}`, older = `test-ls-old-${tag}`;
  const state = `Test State ${tag}`;
  const urls = { newer: `https://example.org/${newer}`, older: `https://example.org/${older}` };
  await publishResults(urls.newer, [
    { state, constituency: "GAYA", name: "A" }, { state, constituency: "GAYA", name: "B" }, { state, constituency: "RANCHI", name: "C" },
  ]);
  await publishResults(urls.older, [{ state, constituency: "Gaya (SC)", name: "D" }, { state, constituency: "Hardwar", name: "E" }]);
  const calendar = [{ id: newer, name: "Newer", body: "lok-sabha" as const }, { id: older, name: "Older", body: "lok-sabha" as const }];
  const results = [{ electionId: newer, url: urls.newer }, { electionId: older, url: urls.older }];

  const first = await linkElections(pool, calendar, results);
  assert.deepEqual(first.byElection, [
    { electionId: newer, contests: 2, candidacies: 3 },
    { electionId: older, contests: 2, candidacies: 2 },
  ]);
  assert.equal(first.seats, 3);
  assert.deepEqual(first.unmatched, [{ electionId: older, seat: `test-state-${tag}/hardwar` }]);

  const gaya = await pool.query(`
    SELECT e.stable_key AS election, count(cy.id)::int AS people FROM area a
    JOIN contest c ON c.area_id = a.id JOIN election e ON e.id = c.election_id JOIN candidacy cy ON cy.contest_id = c.id
    WHERE a.stable_key = $1 GROUP BY e.stable_key ORDER BY e.stable_key`, [seatKey(state, "Gaya")]);
  assert.deepEqual(gaya.rows, [{ election: newer, people: 2 }, { election: older, people: 1 }]);

  const again = await linkElections(pool, calendar, results);
  assert.deepEqual(again.byElection.map((e) => e.contests + e.candidacies), [0, 0], "a second run adds nothing");
});

test("linking refuses results without a calendar record, and bye-elections for now", async () => {
  await assert.rejects(linkElections(pool, [], [{ electionId: "x", url: "https://example.org/x" }]), /no calendar record/);
  await assert.rejects(linkElections(pool, [{ id: "a", name: "A", body: "bye-election" }], [{ electionId: "a", url: "https://example.org/a" }]), /bye-election/);
  await assert.rejects(linkElections(pool, [{ id: "a", name: "A", body: "lok-sabha" }, { id: "a", name: "A", body: "lok-sabha" }], []), /duplicate/);
});

test("the site's calendar loads and includes the three Lok Sabha elections with results", async () => {
  const calendar = await loadCalendar();
  for (const id of ["lok-sabha-2024", "lok-sabha-2019", "lok-sabha-2014"]) {
    assert.equal(calendar.find((election) => election.id === id)?.body, "lok-sabha");
  }
});

test("an assembly seat and a Lok Sabha seat with the same name stay separate areas", async () => {
  const tag = randomUUID().slice(0, 8);
  const state = `Name Clash ${tag}`;
  const ls = `test-ls-${tag}`, ac = `test-ac-${tag}`;
  await publishResults(`https://example.org/${ls}`, [{ state, constituency: "Jhunjhunu", name: "P" }]);
  await publishResults(`https://example.org/${ac}`, [{ state, constituency: "Jhunjhunu", name: "Q", seatNumber: 27 }]);
  const summary = await linkElections(pool,
    [{ id: ls, name: "LS", body: "lok-sabha" }, { id: ac, name: "AC", body: "assembly" }],
    [{ electionId: ls, url: `https://example.org/${ls}` }, { electionId: ac, url: `https://example.org/${ac}` }]);
  assert.equal(summary.seats, 2);
  assert.deepEqual(summary.unmatched, [], "each body is compared only with itself");
  const kinds = await pool.query("SELECT kind FROM area WHERE stable_key IN ($1, $2) ORDER BY kind", [seatKey(state, "Jhunjhunu"), seatKey(state, "Jhunjhunu", "assembly-seat", 27)]);
  assert.deepEqual(kinds.rows.map((row) => row.kind), ["assembly-seat", "lok-sabha-seat"]);
});
