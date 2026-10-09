import assert from "node:assert/strict";
import { test } from "node:test";
import { CivicStore } from "../src/store.js";
import { reconcileDelhiSnapshot } from "../src/delhi/reconcile.js";
import { createTestPool, prepareTestDatabase } from "./db.js";

test("same-name source rows become distinct people with evidence-linked appointments", async () => {
  const pool = createTestPool();
  try {
    await prepareTestDatabase(pool);
    const store = new CivicStore(pool);
    const source = await store.saveSource({ authority: "GNCTD Services Department", url: "https://services.delhi.gov.in/who-is-who", documentType: "html" });
    const snapshot = await store.saveSnapshot(source.id, source.url, `sha256:${"2".repeat(64)}`, new Date().toISOString());
    await store.saveObservations(snapshot.id, [1, 2].map((number) => ({ locator: `row:${number}`, predicate: "appointment.holder", rawValue: "Sh. Same Name", normalizedValue: { name: "Sh. Same Name", department: `Services-${number}`, role: "Section Officer" }, normalizedAt: new Date().toISOString(), normalizerVersion: "test" })));
    assert.equal(await reconcileDelhiSnapshot(pool, "gnctd-services-officers", snapshot.id), 2);
    assert.equal(await reconcileDelhiSnapshot(pool, "gnctd-services-officers", snapshot.id), 2);
    const rows = await pool.query<{ count: string }>("SELECT count(DISTINCT person_id) AS count FROM delhi_appointment da JOIN observation o ON o.id = da.observation_id WHERE o.snapshot_id = $1", [snapshot.id]);
    assert.equal(Number(rows.rows[0].count), 2);
  } finally { await pool.end(); }
});
