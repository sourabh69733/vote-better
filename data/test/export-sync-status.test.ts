import assert from "node:assert/strict";
import test from "node:test";

import { buildSyncStatus } from "../src/export-sync-status.js";
import type { SourceDefinition } from "../src/registry.js";

const source = (id: string): SourceDefinition => ({
  id, title: id, owner: "ECI", url: `https://example.gov.in/${id}`, format: "json", refreshDays: 7,
  reuse: { status: "to-confirm", note: "" }, supplies: [], review: "batch", run: async () => ({ outcome: "succeeded", items: 0, detail: "" }),
});

test("the site gets each source's last good day, and whether it is failing, but no run details", () => {
  const status = buildSyncStatus([source("ok"), source("broken"), source("new")], new Map([
    ["ok", { last: { registryId: "ok", finishedAt: "2026-11-01T10:00:00.000Z", outcome: "succeeded" as const }, lastCompleted: "2026-11-01T10:00:00.000Z", consecutiveFailures: 0 }],
    ["broken", { last: { registryId: "broken", finishedAt: "2026-11-02T10:00:00.000Z", outcome: "failed" as const }, lastCompleted: "2026-10-20T10:00:00.000Z", consecutiveFailures: 2 }],
  ]));
  assert.deepEqual(status.sources.map(({ id, lastChecked, failing }) => ({ id, lastChecked, failing })), [
    { id: "ok", lastChecked: "2026-11-01", failing: false },
    { id: "broken", lastChecked: "2026-10-20", failing: true },
    { id: "new", lastChecked: null, failing: false },
  ]);
  assert.ok(!JSON.stringify(status).includes("detail"));
});
