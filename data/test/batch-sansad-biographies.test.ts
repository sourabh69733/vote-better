import assert from "node:assert/strict";
import test from "node:test";

import { runBiographyBatch } from "../src/batch-sansad-biographies.js";

test("batch processes sorted roster IDs and resumes after the last completed ID", async () => {
  const visited: number[] = [];
  const result = await runBiographyBatch([9, 3, 7, 3], { after: 3, limit: 1, minIntervalMs: 0,
    collect: async (id) => { visited.push(id); return { status: "drafts-saved", memberId: id, drafts: 2 }; },
  });
  assert.deepEqual(visited, [7]);
  assert.deepEqual(result, { attempted: 1, saved: 1, failed: 0, drafts: 2, lastMemberId: 7, remaining: 1 });
});

test("a failed profile is reported without blocking the next member", async () => {
  const result = await runBiographyBatch([2, 1], { limit: 2, minIntervalMs: 0,
    collect: async (id) => id === 1
      ? { status: "source-failed", memberId: id, reason: "HTTP 503" }
      : { status: "drafts-saved", memberId: id, drafts: 3 },
  });
  assert.deepEqual(result, { attempted: 2, saved: 1, failed: 1, drafts: 3,
    lastMemberId: 2, remaining: 0, failedMemberIds: [1] });
});

test("batch rejects invalid roster IDs and unsafe limits", async () => {
  await assert.rejects(() => runBiographyBatch([0], { limit: 1, collect: async () =>
    ({ status: "drafts-saved", memberId: 0, drafts: 0 }) }), /member IDs/);
  await assert.rejects(() => runBiographyBatch([1], { limit: 0, collect: async () =>
    ({ status: "drafts-saved", memberId: 1, drafts: 0 }) }), /limit/);
});
