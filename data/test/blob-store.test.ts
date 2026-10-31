import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LocalBlobStore } from "../src/blob-store.js";

test("local blob storage verifies content hashes and rejects unsafe references", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vote-better-blobs-"));
  try {
    const blobs = new LocalBlobStore(dir);
    const bytes = Buffer.from("scanned source", "utf8");
    const ref = await blobs.put(bytes);
    assert.deepEqual(await blobs.get(ref), bytes);
    assert.deepEqual(await readFile(join(dir, ref)), bytes);
    assert.equal(await blobs.put(bytes), ref);
    await assert.rejects(() => blobs.get("../secret"));
    await writeFile(join(dir, ref), "tampered");
    await assert.rejects(() => blobs.get(ref), /hash mismatch/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
