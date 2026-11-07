import assert from "node:assert/strict";
import test from "node:test";

import { freshnessOf, sourceStatuses } from "./sync-status";

test("a source is overdue only after twice its refresh interval", () => {
  const weekly = { refreshDays: 7, lastChecked: "2026-11-01", failing: false };
  assert.equal(freshnessOf(weekly, "2026-11-15"), "current");
  assert.equal(freshnessOf(weekly, "2026-11-16"), "overdue");
  assert.equal(freshnessOf({ ...weekly, refreshDays: null }, "2027-11-01"), "current", "a fixed archive does not go stale");
  assert.equal(freshnessOf({ ...weekly, failing: true }, "2026-11-02"), "retrying");
  assert.equal(freshnessOf({ ...weekly, lastChecked: null }, "2026-11-02"), "not-checked");
});

test("every source in the status file has an official link", () => {
  assert.ok(sourceStatuses.length > 0);
  for (const source of sourceStatuses) assert.match(source.url, /^https:\/\//);
});
