import assert from "node:assert/strict";
import test from "node:test";

import { buildDraftBatch, type DraftProfile } from "../src/profile-draft.js";

test("one identity conflict is reported without hiding other drafts", async () => {
  const draft = (id: number): DraftProfile => ({ schemaVersion: 1, access: "local-unverified-profile",
    memberId: id, personName: `Member ${id}`, generatedAt: "2026-10-09T00:00:00.000Z", facts: [] });
  const result = await buildDraftBatch([1, 2, 3], async (id) => {
    if (id === 2) throw new Error("official roster identity conflicts with biography");
    return draft(id);
  });
  assert.deepEqual(result.drafts.map((item) => item.memberId), [1, 3]);
  assert.deepEqual(result.exceptions, [{ memberId: 2, reason: "official roster identity conflicts with biography" }]);
});
