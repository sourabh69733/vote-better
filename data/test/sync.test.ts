import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { registry, validateRegistry, type SourceDefinition } from "../src/registry.js";
import { backoffMs, inDependencyOrder, isDue, lastRuns, runSource } from "../src/sync.js";
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

const completed = (lastCompleted: string) => ({ lastCompleted, consecutiveFailures: 0 });

test("a source is due until it completes, then again after its interval", () => {
  const now = new Date("2026-10-25T12:00:00.000Z");
  assert.equal(isDue({ refreshDays: 7 }, undefined, now), true);
  assert.equal(isDue({ refreshDays: 7 }, completed("2026-10-20T12:00:00.000Z"), now), false);
  assert.equal(isDue({ refreshDays: 7 }, completed("2026-10-18T12:00:00.000Z"), now), true);
  assert.equal(isDue({ refreshDays: null }, completed("2020-01-01T00:00:00.000Z"), now), false);
});

test("a failing source waits out a growing backoff before it is due again", () => {
  const now = new Date("2026-10-25T12:00:00.000Z");
  const failedAt = (hoursAgo: number, consecutiveFailures: number) => ({
    last: { registryId: "x", finishedAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(), outcome: "failed" as const },
    consecutiveFailures,
  });
  assert.equal(backoffMs(0), 0);
  assert.equal(backoffMs(1), 3_600_000);
  assert.equal(backoffMs(4), 8 * 3_600_000);
  assert.equal(backoffMs(20), 7 * 86_400_000);
  assert.equal(isDue({ refreshDays: 1 }, failedAt(0.5, 1), now), false);
  assert.equal(isDue({ refreshDays: 1 }, failedAt(1.5, 1), now), true);
  assert.equal(isDue({ refreshDays: 1 }, failedAt(3, 3), now), false);
  assert.equal(isDue({ refreshDays: 1 }, failedAt(5, 3), now), true);
  // A completed run within the interval is not due, even after an older failure streak.
  assert.equal(isDue({ refreshDays: 7 }, { ...failedAt(48, 1), lastCompleted: "2026-10-24T00:00:00.000Z" }, now), false);
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
  assert.ok(runs?.lastCompleted);
  assert.equal(runs?.consecutiveFailures, 1);
  await runSource(pool, fake(id, async () => { throw new Error("still broken"); }));
  assert.equal((await lastRuns(pool)).get(id)?.consecutiveFailures, 2);
  const partial = await runSource(pool, fake(id, async () => ({ outcome: "partial", items: 1, detail: "one of two" })));
  assert.equal(partial.outcome, "partial");
  const afterPartial = (await lastRuns(pool)).get(id);
  assert.equal(afterPartial?.consecutiveFailures, 0);
  assert.equal(afterPartial?.lastCompleted, afterPartial?.last?.finishedAt);
  await assert.rejects(pool.query("DELETE FROM sync_run WHERE registry_id = $1", [id]), /immutable/);
});

test("a run that passes its deadline is logged as failed and the runner moves on", async () => {
  const id = `test-slow-${Date.now()}`;
  let release!: () => void;
  const slow = fake(id, () => new Promise((done) => { release = () => done({ outcome: "succeeded", items: 1, detail: "late" }); }));
  const result = await runSource(pool, slow, () => {}, { timeoutMs: 50 });
  assert.equal(result.outcome, "failed");
  assert.match(result.detail, /timed out/);
  assert.equal((await lastRuns(pool)).get(id)?.last?.outcome, "failed");
  // The slow run still holds the lock, so a second runner skips the source rather than overlapping it.
  const overlapping = await runSource(pool, fake(id, async () => ({ outcome: "succeeded", items: 0, detail: "" })));
  assert.deepEqual(overlapping, { outcome: "skipped", detail: "another sync is running this source" });
  release();
  await new Promise((done) => setTimeout(done, 100));
  const again = await runSource(pool, fake(id, async () => ({ outcome: "succeeded", items: 2, detail: "after release" })));
  assert.equal(again.outcome, "succeeded");
});

test("a source id is rejected when its timeout is not positive", () => {
  assert.throws(() => validateRegistry([fake("a", async () => ({ outcome: "succeeded", items: 0, detail: "" }), { timeoutMinutes: 0 })]), /invalid timeout/);
});
