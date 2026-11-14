import assert from "node:assert/strict";
import test from "node:test";

import { fetchJaipurLegacyTls } from "../src/sources/rajasthan-legacy-tls.js";
import { JAIPUR_FORM21E_URL } from "../src/import-jaipur.js";

test("source-specific TLS adapter reads the official PDF", {
  skip: process.env.RUN_LIVE_SOURCE !== "1",
}, async () => {
  const response = await fetchJaipurLegacyTls(JAIPUR_FORM21E_URL);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/pdf/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString("ascii"), "%PDF-");
});
