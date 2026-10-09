import { createHash } from "node:crypto";
import type pg from "pg";
import { DelhiRegistry } from "./registry.js";
import { delhiSources } from "./source-catalog.js";

function stableKey(parts: readonly string[]): string {
  return `delhi:${createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`;
}

function claim(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : undefined;
}

export async function reconcileDelhiSnapshot(pool: pg.Pool, sourceId: string, snapshotId: string): Promise<number> {
  const definition = delhiSources.find((item) => item.id === sourceId);
  if (!definition || !["gnctd-services-officers", "delhi-assembly-secretariat", "delhi-police-contacts"].includes(sourceId)) throw new Error("source has no Delhi identity mapping");
  const snapshot = await pool.query<{ url: string }>("SELECT s.url FROM snapshot s JOIN source src ON src.id = s.source_id WHERE s.id = $1 AND src.url = $2", [snapshotId, definition.url]);
  if (!snapshot.rows.length) throw new Error("snapshot does not belong to audited source");
  const rows = await pool.query<{ id: string; locator: string; predicate: string; normalized_value: unknown }>("SELECT id, locator, predicate, normalized_value FROM observation WHERE snapshot_id = $1 ORDER BY locator", [snapshotId]);
  const registry = new DelhiRegistry(pool);
  let reconciled = 0;
  for (const row of rows.rows) {
    const name = claim(row.normalized_value, "name");
    const role = claim(row.normalized_value, "role");
    const office = claim(row.normalized_value, "office");
    const department = claim(row.normalized_value, "department");
    if (sourceId === "delhi-police-contacts") {
      if (row.predicate !== "contact.official" || !office) continue;
      const institutionId = await registry.upsertInstitutionDraft({ stableKey: stableKey([sourceId, "police"]), name: "Delhi Police", kind: "police", observationId: row.id });
      await registry.recordOfficeDraft({ stableKey: stableKey([sourceId, office]), institutionId, title: office, observationId: row.id });
      reconciled += 1;
      continue;
    }
    if (row.predicate !== "appointment.holder" || !name || !role) continue;
    const institutionName = sourceId === "delhi-assembly-secretariat" ? "Delhi Legislative Assembly" : department;
    if (!institutionName) continue;
    const institutionId = await registry.upsertInstitutionDraft({ stableKey: stableKey([sourceId, institutionName]), name: institutionName,
      kind: sourceId === "delhi-assembly-secretariat" ? "government" : "department", observationId: row.id });
    const officeId = await registry.recordOfficeDraft({ stableKey: stableKey([sourceId, institutionName, role]), institutionId, title: role, observationId: row.id });
    // The locator is part of the provisional identity. A shared name does not merge rows.
    const personKey = stableKey([sourceId, row.locator, name]);
    const inserted = await pool.query<{ id: string }>("INSERT INTO person (stable_key, display_name) VALUES ($1,$2) ON CONFLICT (stable_key) DO NOTHING RETURNING id", [personKey, name]);
    const personId = inserted.rows[0]?.id ?? (await pool.query<{ id: string; display_name: string }>("SELECT id, display_name FROM person WHERE stable_key = $1", [personKey])).rows[0].id;
    await registry.recordAppointmentDraft({ officeId, personId, observationId: row.id });
    reconciled += 1;
  }
  return reconciled;
}
