import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadDelhiPublication, validateDelhiPublication } from "./delhi";

const empty = { schemaVersion: 1, audience: "preview", revision: `sha256:${"a".repeat(64)}`, generatedAt: "2026-10-09T00:00:00.000Z", institutions: [], offices: [], people: [], appointments: [], jurisdictions: [], facilities: [], coverage: [], traces: [] };

test("loader rejects broken person-office references and preview in production", async () => {
  const directory = await mkdtemp(join(tmpdir(), "delhi-web-"));
  const path = join(directory, "publication.json");
  try {
    await writeFile(path, JSON.stringify({ ...empty, appointments: [{ id: "a", officeId: "missing", personId: "missing", status: "current", traceId: "missing" }] }));
    await assert.rejects(loadDelhiPublication(path, "preview"), /reference/i);
    await writeFile(path, JSON.stringify(empty));
    assert.equal((await loadDelhiPublication(path, "preview")).appointments.length, 0);
    await assert.rejects(loadDelhiPublication(path, "production"), /preview/i);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("validator rejects duplicate current officeholders", () => {
  const publication = { ...empty, institutions: [{ id: "i", name: "Body", kind: "government" }], offices: [{ id: "o", institutionId: "i", title: "Office" }], people: [{ id: "p1", name: "A" }, { id: "p2", name: "B" }], traces: [{ id: "t1", sourceUrl: "https://example.org", locator: "1", observationId: "t1", contentHash: "sha256:abc", capturedAt: empty.generatedAt, checkedAt: empty.generatedAt, reviewedAt: empty.generatedAt }, { id: "t2", sourceUrl: "https://example.org", locator: "2", observationId: "t2", contentHash: "sha256:abc", capturedAt: empty.generatedAt, checkedAt: empty.generatedAt, reviewedAt: empty.generatedAt }], appointments: [{ id: "a1", officeId: "o", personId: "p1", status: "current", traceId: "t1" }, { id: "a2", officeId: "o", personId: "p2", status: "current", traceId: "t2" }] };
  assert.throws(() => validateDelhiPublication(publication), /current/i);
});
