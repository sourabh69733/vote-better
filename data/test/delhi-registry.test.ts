import assert from "node:assert/strict";
import { test } from "node:test";
import { CivicStore } from "../src/store.js";
import { DelhiRegistry } from "../src/delhi/registry.js";
import { createTestPool, prepareTestDatabase } from "./db.js";

test("an evidence-linked office has successive holders without merging people", async () => {
  const pool = createTestPool();
  try {
    await prepareTestDatabase(pool);
    const store = new CivicStore(pool);
    const source = await store.saveSource({ authority: "Delhi test source", url: `https://example.org/${crypto.randomUUID()}`, documentType: "html" });
    const snapshot = await store.saveSnapshot(source.id, source.url, `sha256:${"1".repeat(64)}`, new Date().toISOString());
    const [observation] = await store.saveObservations(snapshot.id, [{ locator: "row 1", predicate: "appointment.holder", rawValue: "Name", normalizedValue: "Name", normalizedAt: new Date().toISOString(), normalizerVersion: "test-v1" }]);
    const registry = new DelhiRegistry(pool);
    const institutionId = await registry.upsertInstitutionDraft({ stableKey: `gnctd:${crypto.randomUUID()}`, name: "Services", kind: "department", observationId: observation.id });
    const officeId = await registry.recordOfficeDraft({ stableKey: `office:${crypto.randomUUID()}`, institutionId, title: "Secretary", observationId: observation.id });
    const first = await pool.query<{ id: string }>("INSERT INTO person (stable_key, display_name) VALUES ($1, 'Example') RETURNING id", [`test:${crypto.randomUUID()}`]);
    const second = await pool.query<{ id: string }>("INSERT INTO person (stable_key, display_name) VALUES ($1, 'Example') RETURNING id", [`test:${crypto.randomUUID()}`]);
    const appointmentA = await registry.recordAppointmentDraft({ officeId, personId: first.rows[0].id, observationId: observation.id });
    const appointmentB = await registry.recordAppointmentDraft({ officeId, personId: second.rows[0].id, observationId: observation.id });
    assert.notEqual(appointmentA, appointmentB);
    const secondOfficeId = await registry.recordOfficeDraft({ stableKey: `office:${crypto.randomUUID()}`, institutionId, title: "Additional Secretary", observationId: observation.id });
    await registry.recordAppointmentDraft({ officeId: secondOfficeId, personId: first.rows[0].id, observationId: observation.id });
    const area = await pool.query<{ id: string }>("INSERT INTO area (stable_key, name) VALUES ($1, 'Delhi') RETURNING id", [`test:${crypto.randomUUID()}`]);
    await registry.recordJurisdictionDraft({ officeId, areaId: area.rows[0].id, observationId: observation.id });
    await registry.recordJurisdictionDraft({ officeId: secondOfficeId, areaId: area.rows[0].id, observationId: observation.id });
    const overlap = await pool.query<{ count: string }>("SELECT count(*) FROM delhi_jurisdiction WHERE area_id = $1", [area.rows[0].id]);
    assert.equal(Number(overlap.rows[0].count), 2);
    const drafts = await registry.listDelhiReviewCandidates();
    assert.equal(drafts.filter((item) => item.officeId === officeId).length, 2);
    await assert.rejects(pool.query("UPDATE delhi_appointment SET person_id = $1 WHERE id = $2", [second.rows[0].id, appointmentA]), /immutable/i);
  } finally { await pool.end(); }
});
