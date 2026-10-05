import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";
import { createTestPool, prepareTestDatabase } from "./db.js";
import { collectJaipurForm21E } from "../src/sources/rajasthan-form21e.js";
import { CivicStore } from "../src/store.js";

const pool = createTestPool();
const store = new CivicStore(pool);

before(async () => { await prepareTestDatabase(pool); });
after(async () => { await pool.end(); });

test("collector stores one snapshot for repeated PDF content and logs each check", async () => {
  const source = await store.saveSource({
    authority: "Rajasthan CEO", documentType: "Form 21E",
    url: `https://example.org/${randomUUID()}.pdf`,
  });
  const bytes = Buffer.from("%PDF-1.7\nmock document\n");
  const fetcher = async () => new Response(bytes, { status: 200, headers: { "content-type": "application/pdf" } });
  const first = await collectJaipurForm21E(source, store, { fetcher, retryDelayMs: 0, minIntervalMs: 0 });
  const second = await collectJaipurForm21E(source, store, { fetcher, retryDelayMs: 0, minIntervalMs: 0 });
  assert.equal(first.status, "succeeded");
  assert.equal(second.status, "succeeded");
  if (first.status !== "succeeded" || second.status !== "succeeded") return;
  assert.equal(first.snapshot.id, second.snapshot.id);
  const rows = await pool.query("SELECT count(*)::integer AS count FROM collection_attempt WHERE source_id = $1", [source.id]);
  assert.equal(rows.rows[0].count, 2);
});

test("collector records unavailable and invalid sources without changing saved facts", async () => {
  const source = await store.saveSource({
    authority: "Rajasthan CEO", documentType: "Form 21E",
    url: `https://example.org/${randomUUID()}.pdf`,
  });
  const good = await collectJaipurForm21E(source, store, {
    fetcher: async () => new Response(Buffer.from("%PDF-1.7\nprevious document\n"), {
      status: 200, headers: { "content-type": "application/pdf" },
    }),
    minIntervalMs: 0,
  });
  assert.equal(good.status, "succeeded");
  if (good.status !== "succeeded") return;
  await store.saveObservations(good.snapshot.id, [{
    locator: "page 1, candidate row 2, votes", predicate: "candidate.votesPolled",
    rawValue: "886850", normalizedValue: 886850,
    normalizedAt: new Date().toISOString(), normalizerVersion: "test-v1",
  }]);
  let calls = 0;
  const fetcher = async () => { calls += 1; return new Response("error page", { status: 200, headers: { "content-type": "text/html" } }); };
  const result = await collectJaipurForm21E(source, store, { fetcher, maxAttempts: 2, retryDelayMs: 0, minIntervalMs: 0 });
  assert.equal(result.status, "failed");
  assert.equal(calls, 2);
  const attempts = await pool.query("SELECT outcome FROM collection_attempt WHERE source_id = $1", [source.id]);
  assert.deepEqual(attempts.rows.map((row) => row.outcome), ["succeeded", "invalid", "invalid"]);
  const snapshots = await pool.query("SELECT count(*)::integer AS count FROM snapshot WHERE source_id = $1", [source.id]);
  assert.equal(snapshots.rows[0].count, 1);
  const observations = await pool.query("SELECT count(*)::integer AS count FROM observation WHERE snapshot_id = $1", [good.snapshot.id]);
  assert.equal(observations.rows[0].count, 1);
});
