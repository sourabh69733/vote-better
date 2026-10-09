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

test("minister portfolios map to distinct offices", async () => {
  const pool = createTestPool();
  try {
    await prepareTestDatabase(pool);
    const store = new CivicStore(pool);
    const source = await store.saveSource({ authority: "Government of NCT of Delhi", url: "https://delhi.gov.in/council-of-ministers-office", documentType: "html" });
    const snapshot = await store.saveSnapshot(source.id, source.url, `sha256:${"3".repeat(64)}`, new Date().toISOString());
    await store.saveObservations(snapshot.id, ["Health", "Education"].map((portfolio, index) => ({ locator: `/profile/example-${index}`, predicate: "appointment.holder", rawValue: `Minister ${index}`, normalizedValue: { name: `Minister ${index}`, department: "Government of NCT of Delhi", role: "Minister", portfolio }, normalizedAt: new Date().toISOString(), normalizerVersion: "test" })));
    assert.equal(await reconcileDelhiSnapshot(pool, "gnctd-ministers", snapshot.id), 2);
    const offices = await pool.query<{ title: string }>("SELECT DISTINCT dof.title FROM delhi_office dof JOIN delhi_appointment da ON da.office_id = dof.id JOIN observation o ON o.id = da.observation_id WHERE o.snapshot_id = $1 ORDER BY dof.title", [snapshot.id]);
    assert.deepEqual(offices.rows.map((row) => row.title), ["Minister for Education", "Minister for Health"]);
  } finally { await pool.end(); }
});
