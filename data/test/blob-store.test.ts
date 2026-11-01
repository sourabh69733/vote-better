import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LocalBlobStore, openBlobStore, S3BlobStore } from "../src/blob-store.js";

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

// A bucket kept in memory, answering the three calls the store makes.
function fakeBucket() {
  const objects = new Map<string, Buffer>();
  const calls: string[] = [];
  const client = {
    async send(command: { constructor: { name: string }; input: { Key: string; Body?: Buffer } }) {
      const name = command.constructor.name;
      calls.push(`${name} ${command.input.Key}`);
      const found = objects.get(command.input.Key);
      if (name === "PutObjectCommand") { objects.set(command.input.Key, command.input.Body!); return {}; }
      if (!found) throw Object.assign(new Error("missing"), { name: name === "HeadObjectCommand" ? "NotFound" : "NoSuchKey" });
      return name === "GetObjectCommand" ? { Body: { transformToByteArray: async () => new Uint8Array(found) } } : {};
    },
  };
  return { objects, calls, client: client as unknown as ConstructorParameters<typeof S3BlobStore>[0] };
}

test("bucket blob storage uploads once and refills an empty cache from the bucket", async () => {
  const [first, second] = await Promise.all([mkdtemp(join(tmpdir(), "vote-better-s3-")), mkdtemp(join(tmpdir(), "vote-better-s3-"))]);
  try {
    const bucket = fakeBucket();
    const bytes = Buffer.from("statistical report", "utf8");
    const ref = await new S3BlobStore(bucket.client, "raw", "eci-2024/blobs/", first).put(bytes);
    assert.deepEqual([...bucket.objects.keys()], [`eci-2024/blobs/${ref}`]);
    await new S3BlobStore(bucket.client, "raw", "eci-2024/blobs/", first).put(bytes);
    assert.equal(bucket.calls.filter((call) => call.startsWith("PutObjectCommand")).length, 1, "an object already in the bucket is not uploaded again");

    // A fresh machine has no local copy: the bytes come from the bucket and are checked against the hash.
    const fresh = new S3BlobStore(bucket.client, "raw", "eci-2024/blobs/", second);
    assert.deepEqual(await fresh.get(ref), bytes);
    assert.deepEqual(await readFile(join(second, ref)), bytes);
    bucket.objects.set(`eci-2024/blobs/${ref}`, Buffer.from("tampered"));
    await rm(join(second, ref));
    await assert.rejects(() => fresh.get(ref), /hash mismatch/);
    await assert.rejects(() => fresh.get("../secret"), /invalid blob reference/);
  } finally {
    await Promise.all([first, second].map((dir) => rm(dir, { recursive: true, force: true })));
  }
});

test("raw files stay local unless a bucket is configured", () => {
  assert.ok(openBlobStore("eci-2024/blobs/", {}) instanceof LocalBlobStore);
  assert.ok(openBlobStore("eci-2024/blobs/", { BLOB_BUCKET: "raw", BLOB_ENDPOINT: "https://example.r2.cloudflarestorage.com" }) instanceof S3BlobStore);
  assert.throws(() => openBlobStore("eci-2024/blobs/", { BLOB_BUCKET: "raw" }), /BLOB_ENDPOINT/);
});
