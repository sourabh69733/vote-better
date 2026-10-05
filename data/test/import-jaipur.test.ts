import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import pg from "pg";

import { migrate } from "../src/migrate.js";
import { importJaipurForm21E } from "../src/import-jaipur.js";
import { CivicStore } from "../src/store.js";

const file = new URL("../extractions/jaipur-form21e-2024.json", import.meta.url);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better",
});
const store = new CivicStore(pool);

before(async () => { await migrate(pool); });
after(async () => { await pool.end(); });

async function transcription() {
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

test("import creates drafts once and stops when the PDF changes", async () => {
  const url = `https://example.org/${randomUUID()}.pdf`;
  const bytes = Buffer.from("%PDF-1.7\nmock audited document\n");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const input = { ...(await transcription() as Record<string, unknown>), sourceUrl: url, snapshotSha256: hash };
  const fetcher = async () => new Response(bytes, { status: 200, headers: { "content-type": "application/pdf" } });
  const options = { sourceUrl: url, transcription: input, fetcher, minIntervalMs: 0, retryDelayMs: 0 };
  const first = await importJaipurForm21E(store, options);
  const second = await importJaipurForm21E(store, options);
  assert.equal(first.status, "drafts-saved");
  assert.equal(second.status, "drafts-saved");
  if (first.status !== "drafts-saved" || second.status !== "drafts-saved") return;
  assert.equal(first.snapshotId, second.snapshotId);
  assert.deepEqual(first.observationIds, second.observationIds);
  assert.equal(first.observationIds.length, 47);

  const changed = await importJaipurForm21E(store, {
    ...options,
    fetcher: async () => new Response(Buffer.from("%PDF-1.7\nrevised document\n"), {
      status: 200, headers: { "content-type": "application/pdf" },
    }),
  });
  assert.equal(changed.status, "needs-transcription");
  const source = await pool.query("SELECT id FROM source WHERE url = $1", [url]);
  const count = await pool.query(
    "SELECT count(*)::integer AS count FROM observation WHERE snapshot_id IN (SELECT id FROM snapshot WHERE source_id = $1)",
    [source.rows[0].id],
  );
  assert.equal(count.rows[0].count, 47);
});
