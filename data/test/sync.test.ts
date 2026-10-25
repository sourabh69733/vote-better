import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { registry, validateRegistry, type SourceDefinition } from "../src/registry.js";
import { inDependencyOrder, isDue, lastRuns, runSource } from "../src/sync.js";
import { createTestPool, prepareTestDatabase } from "./db.js";

const pool = createTestPool();
before(async () => { await prepareTestDatabase(pool); });
after(async () => { await pool.end(); });

const fake = (id: string, run: SourceDefinition["run"], extra: Partial<SourceDefinition> = {}): SourceDefinition => ({
  id, title: id, owner: "Test", url: "https://example.org/", format: "json", refreshDays: 1,
  reuse: { status: "to-confirm", note: "test" }, supplies: ["test.field"], review: "per-fact", run, ...extra,
});

test("the real registry is valid and lists every source once", () => {
  validateRegistry();
  assert.ok(registry.some((source) => source.id === "eci-ge2024-results"));
  assert.throws(() => validateRegistry([fake("a", async () => ({ outcome: "succeeded", items: 0, detail: "" }), { reuse: { status: "restricted", note: "" } })]), /restricted/);
  assert.throws(() => validateRegistry([fake("a", async () => ({ outcome: "succeeded", items: 0, detail: "" }), { dependsOn: ["missing"] })]), /unknown missing/);
});

test("a source is due until it succeeds, then again after its interval", () => {
  const now = new Date("2026-10-25T12:00:00.000Z");
  assert.equal(isDue({ refreshDays: 7 }, undefined, now), true);
  assert.equal(isDue({ refreshDays: 7 }, "2026-10-20T12:00:00.000Z", now), false);
  assert.equal(isDue({ refreshDays: 7 }, "2026-10-18T12:00:00.000Z", now), true);
  assert.equal(isDue({ refreshDays: null }, "2020-01-01T00:00:00.000Z", now), false);
});

test("sources run after the sources they depend on", () => {
  const sources = [{ id: "biographies", dependsOn: ["members"] }, { id: "members" }, { id: "other" }];
  assert.deepEqual(inDependencyOrder(sources).map((source) => source.id), ["members", "biographies", "other"]);
  assert.throws(() => inDependencyOrder([{ id: "a", dependsOn: ["b"] }, { id: "b", dependsOn: ["a"] }]), /cycle/);
});

test("every run is logged, including a source that throws", async () => {
  const id = `test-${Date.now()}`;
  const ok = await runSource(pool, fake(id, async () => ({ outcome: "succeeded", items: 3, detail: "three rows" })));
  assert.equal(ok.outcome, "succeeded");
  const broken = await runSource(pool, fake(id, async () => { throw new Error("source changed its format"); }));
  assert.deepEqual(broken, { outcome: "failed", items: 0, detail: "source changed its format" });
  const runs = (await lastRuns(pool)).get(id);
  assert.equal(runs?.last?.outcome, "failed");
  assert.ok(runs?.lastSuccess);
  await assert.rejects(pool.query("DELETE FROM sync_run WHERE registry_id = $1", [id]), /immutable/);
});
