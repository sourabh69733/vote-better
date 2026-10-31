import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { LocalBlobStore } from "../src/blob-store.js";
import { collectDelhiSource } from "../src/delhi/collect.js";
import { CivicStore } from "../src/store.js";
import { createTestPool, prepareTestDatabase } from "./db.js";

const html = `<table class="views-table"><tr><th>Department</th><th>Designation</th><th>Office No.</th></tr><tr><td>1</td><td>Sh. A Person</td><td>Services</td><td>Secretary</td><td></td><td>011-12345678</td><td></td></tr></table>`;

test("capture stores official bytes and drafts; failed refresh records attempt without deletion", async () => {
  const pool = createTestPool();
  const directory = await mkdtemp(join(tmpdir(), "delhi-capture-"));
  try {
    await prepareTestDatabase(pool);
    const store = new CivicStore(pool);
    const blobStore = new LocalBlobStore(directory);
    const succeeded = await collectDelhiSource("gnctd-services-officers", store, blobStore, {
      fetcher: async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }), minIntervalMs: 0,
    });
    assert.equal(succeeded.outcome, "succeeded");
    assert.equal(succeeded.drafts, 1);
    const failed = await collectDelhiSource("gnctd-services-officers", store, blobStore, {
      fetcher: async () => new Response("unavailable", { status: 503 }), minIntervalMs: 0,
    });
    assert.equal(failed.outcome, "unavailable");
    const count = await pool.query<{ count: string }>("SELECT count(*) FROM observation WHERE snapshot_id = $1", [succeeded.snapshotId]);
    assert.equal(Number(count.rows[0].count), 1);
    await assert.rejects(collectDelhiSource("delhi-police-stations", store, blobStore, { minIntervalMs: 0 }), /link-only/i);
  } finally { await pool.end(); await rm(directory, { recursive: true, force: true }); }
});
