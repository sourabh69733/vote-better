import assert from "node:assert/strict";
import test from "node:test";

import { importSansadBiography } from "../src/import-sansad-biography.js";

function store() {
  const observations: { snapshotId: string; predicates: string[] }[] = [];
  const attempts: { outcome: string; snapshotId?: string }[] = [];
  return {
    observations, attempts,
    async saveSource(input: { url: string }) { return { ...input, id: input.url, authority: "Parliament of India",
      documentType: "JSON", recordedAt: new Date().toISOString() }; },
    async saveSnapshot(sourceId: string, url: string, contentHash: string, capturedAt: string, blobRef?: string) {
      assert.match(contentHash, /^sha256:[0-9a-f]{64}$/);
      assert.match(blobRef ?? "", /^sha256\//);
      return { id: url, sourceId, url, contentHash, capturedAt, recordedAt: capturedAt, blobRef };
    },
    async recordCollectionAttempt(input: { outcome: string; snapshotId?: string }) { attempts.push(input); return {} as never; },
    async saveObservations(snapshotId: string, drafts: readonly { predicate: string }[]) {
      observations.push({ snapshotId, predicates: drafts.map((draft) => draft.predicate) });
      return [] as never;
    },
  };
}

const biography = { mpsno: 5619, fullName: "Smt. Manju Sharma", education: "<body>MA, LLB</body>" };
const positions = [{ period: "June 2024", positionHeld: "Elected to 18th Lok Sabha" }];
const blobStore = { async put(bytes: Buffer) { assert.ok(bytes.length); return `sha256/${"a".repeat(64)}`; },
  async get() { return Buffer.alloc(0); } };

test("imports biography and positions as separate immutable review drafts", async () => {
  const dataStore = store();
  const urls: string[] = [];
  const result = await importSansadBiography(dataStore, 5619, {
    minIntervalMs: 0,
    blobStore,
    fetcher: async (url) => {
      urls.push(url);
      return new Response(JSON.stringify(url.includes("positionHeld") ? positions : biography),
        { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.deepEqual(result, { status: "drafts-saved", memberId: 5619, drafts: 4 });
  assert.equal(urls.length, 2);
  assert.equal(dataStore.attempts.filter((item) => item.outcome === "succeeded").length, 2);
  assert.equal(dataStore.observations.length, 2);
  assert.ok(dataStore.observations[1].predicates.includes("office.positionsHeld"));
});

test("a failed second endpoint cannot save a partial profile update", async () => {
  const dataStore = store();
  const result = await importSansadBiography(dataStore, 5619, { minIntervalMs: 0, blobStore,
    fetcher: async (url) => new Response(url.includes("positionHeld") ? "offline" : JSON.stringify(biography),
      { status: url.includes("positionHeld") ? 503 : 200,
        headers: { "content-type": "application/json" } }),
  });
  assert.equal(result.status, "source-failed");
  assert.equal(dataStore.observations.length, 0);
  assert.deepEqual(dataStore.attempts.map((item) => item.outcome), ["succeeded", "unavailable"]);
});

test("a mismatched biography ID is rejected before saving observations", async () => {
  const dataStore = store();
  const result = await importSansadBiography(dataStore, 5619, { minIntervalMs: 0, blobStore,
    fetcher: async () => new Response(JSON.stringify({ ...biography, mpsno: 9999 }),
      { status: 200, headers: { "content-type": "application/json" } }),
  });
  assert.equal(result.status, "source-failed");
  assert.equal(dataStore.observations.length, 0);
  assert.deepEqual(dataStore.attempts.map((item) => item.outcome), ["invalid"]);
});
