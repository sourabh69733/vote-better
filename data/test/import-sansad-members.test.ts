import assert from "node:assert/strict";
import test from "node:test";

import { importSansadMembers } from "../src/import-sansad-members.js";

function member(id: number) {
  return { mpsno: id, mpFirstLastName: `Member ${id}`, partyFname: "Example Party", stateName: "Rajasthan",
    constName: `Area ${id}`, status: "Sitting" };
}

test("imports all pages as drafts with stable IDs and source snapshots", async () => {
  const snapshots: string[] = [];
  const saved: string[] = [];
  const store = {
    async saveSource(input: { url: string }) { return { ...input, id: input.url, authority: "Parliament of India", documentType: "Lok Sabha member list", recordedAt: new Date().toISOString() }; },
    async saveSnapshot(sourceId: string, url: string, contentHash: string) {
      snapshots.push(contentHash); return { id: url, sourceId, url, contentHash, capturedAt: new Date().toISOString(), recordedAt: new Date().toISOString() };
    },
    async recordCollectionAttempt() { return {} as never; },
    async saveObservations(snapshotId: string, drafts: readonly { locator: string }[]) {
      saved.push(...drafts.map((draft) => `${snapshotId}:${draft.locator}`));
      return drafts.map((draft, index) => ({ ...draft, id: `${snapshotId}:${index}` })) as never;
    },
  };
  const fetcher = async (url: string) => {
    const page = Number(new URL(url).searchParams.get("page"));
    const body = { metaDatasDto: { currentPageNumber: page, perPageSize: 1, totalElements: 2, totalPages: 2 },
      membersDtoList: [member(page)] };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  const result = await importSansadMembers(store, { fetcher, pageSize: 1, minIntervalMs: 0 });
  assert.deepEqual(result, { status: "drafts-saved", pages: 2, members: 2, drafts: 12 });
  assert.equal(snapshots.length, 2);
  assert.ok(saved.some((item) => item.includes("mpsno=1")));
  assert.ok(saved.some((item) => item.includes("mpsno=2")));
});

test("changed page counts do not save partial drafts", async () => {
  let saved = false;
  const store = {
    async saveSource(input: { url: string }) { return { ...input, id: input.url, authority: "Parliament of India", documentType: "Lok Sabha member list", recordedAt: new Date().toISOString() }; },
    async saveSnapshot(sourceId: string, url: string, contentHash: string) { return { id: url, sourceId, url, contentHash, capturedAt: new Date().toISOString(), recordedAt: new Date().toISOString() }; },
    async recordCollectionAttempt() { return {} as never; },
    async saveObservations() { saved = true; return [] as never; },
  };
  const fetcher = async (url: string) => {
    const page = Number(new URL(url).searchParams.get("page"));
    return new Response(JSON.stringify({ metaDatasDto: { currentPageNumber: page, perPageSize: 1,
      totalElements: page === 1 ? 2 : 3, totalPages: 2 }, membersDtoList: [member(page)] }),
    { status: 200, headers: { "content-type": "application/json" } });
  };
  const result = await importSansadMembers(store, { fetcher, pageSize: 1, minIntervalMs: 0 });
  assert.equal(result.status, "source-failed");
  assert.equal(saved, false);
});
