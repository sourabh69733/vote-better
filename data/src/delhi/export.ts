import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type pg from "pg";
import type { BlobStore } from "../blob-store.js";
import { delhiSources, type DelhiSourceDefinition } from "./source-catalog.js";
import { normalizeGnctd } from "./normalize/gnctd.js";
import { normalizeAssembly } from "./normalize/assembly.js";
import { normalizePolice } from "./normalize/police.js";

export interface ReviewedDelhiRow {
  observationId: string;
  institutionId: string; institutionName: string; institutionKind: string;
  officeId: string; officeTitle: string;
  personId?: string; personName?: string;
  status: "source-listed" | "current" | "former";
  source: { id: string; url: string; locator: string; contentHash: string; capturedAt: string };
  review: { decision: "approved" | "rejected" | "needs-changes"; reviewedAt: string };
  check: { contentHash: string; checkedAt: string };
  reuseStatus: DelhiSourceDefinition["reuseStatus"];
  contactKind?: "official" | "private";
  officeContact?: string;
}

export interface DelhiPublication {
  schemaVersion: 1;
  audience: "preview" | "production";
  revision: string;
  generatedAt: string;
  institutions: { id: string; name: string; kind: string }[];
  offices: { id: string; institutionId: string; title: string; officeContact?: string }[];
  people: { id: string; name: string }[];
  appointments: { id: string; officeId: string; personId: string; status: ReviewedDelhiRow["status"]; traceId: string }[];
  jurisdictions: { id: string; officeId: string; areaId: string; traceId: string }[];
  facilities: { id: string; institutionId: string; name: string; traceId: string }[];
  coverage: { sourceId: string; state: "partial" | "stale" | "missing"; publishedRows: number; lastCapturedAt?: string }[];
  traces: { id: string; observationId: string; sourceUrl: string; locator: string; contentHash: string; capturedAt: string; checkedAt: string; reviewedAt: string }[];
}

export function buildDelhiPublication(rows: readonly ReviewedDelhiRow[], audience: "preview" | "production", generatedAt = new Date().toISOString()): DelhiPublication {
  const institutions = new Map<string, DelhiPublication["institutions"][number]>();
  const offices = new Map<string, DelhiPublication["offices"][number]>();
  const people = new Map<string, DelhiPublication["people"][number]>();
  const appointments: DelhiPublication["appointments"] = [];
  const traces: DelhiPublication["traces"] = [];
  const currentOffices = new Set<string>();
  for (const row of rows) {
    if (row.review.decision !== "approved" || !row.review.reviewedAt) throw new Error("Delhi row is not approved");
    if (row.source.contentHash !== row.check.contentHash || Date.parse(row.check.checkedAt) < Date.parse(row.source.capturedAt)) throw new Error("stale source check");
    if (row.contactKind === "private") throw new Error("private contact cannot be published");
    if (audience === "production" && row.reuseStatus !== "approved") throw new Error("source reuse is not approved for production");
    if (!row.source.url.startsWith("https://") || !row.source.locator || !row.observationId) throw new Error("missing source trace");
    const priorInstitution = institutions.get(row.institutionId);
    if (priorInstitution && (priorInstitution.name !== row.institutionName || priorInstitution.kind !== row.institutionKind)) throw new Error("conflicting institution identity");
    institutions.set(row.institutionId, { id: row.institutionId, name: row.institutionName, kind: row.institutionKind });
    const priorOffice = offices.get(row.officeId);
    if (priorOffice && (priorOffice.institutionId !== row.institutionId || priorOffice.title !== row.officeTitle)) throw new Error("conflicting office identity");
    offices.set(row.officeId, { id: row.officeId, institutionId: row.institutionId, title: row.officeTitle, ...(row.officeContact ? { officeContact: row.officeContact } : {}) });
    if (row.personId && row.personName) {
      const priorPerson = people.get(row.personId);
      if (priorPerson && priorPerson.name !== row.personName) throw new Error("conflicting person identity");
      people.set(row.personId, { id: row.personId, name: row.personName });
      if (row.status === "current") {
        if (currentOffices.has(row.officeId)) throw new Error("duplicate current officeholders need review");
        currentOffices.add(row.officeId);
      }
      appointments.push({ id: row.observationId, officeId: row.officeId, personId: row.personId, status: row.status, traceId: row.observationId });
    }
    traces.push({ id: row.observationId, observationId: row.observationId, sourceUrl: row.source.url, locator: row.source.locator,
      contentHash: row.source.contentHash, capturedAt: row.source.capturedAt, checkedAt: row.check.checkedAt, reviewedAt: row.review.reviewedAt });
  }
  const sourceIds = [...new Set(rows.map((row) => row.source.id))];
  const coverage = sourceIds.map((sourceId) => ({ sourceId, state: "partial" as const,
    publishedRows: rows.filter((row) => row.source.id === sourceId).length,
    lastCapturedAt: rows.filter((row) => row.source.id === sourceId).map((row) => row.source.capturedAt).sort().at(-1) }));
  const revision = `sha256:${createHash("sha256").update(JSON.stringify(rows.map((row) => [row.observationId, row.review.reviewedAt, row.check.contentHash]).sort())).digest("hex")}`;
  return { schemaVersion: 1, audience, revision, generatedAt, institutions: [...institutions.values()], offices: [...offices.values()], people: [...people.values()], appointments, jurisdictions: [], facilities: [], coverage, traces };
}

const parsers = { "gnctd-services-officers": normalizeGnctd, "delhi-assembly-secretariat": normalizeAssembly, "delhi-police-contacts": normalizePolice } as const;

export async function loadReviewedDelhiRows(pool: pg.Pool, blobs: BlobStore): Promise<ReviewedDelhiRow[]> {
  const result = await pool.query(`
    SELECT o.id AS observation_id, o.locator, o.predicate, o.normalized_value, s.id AS snapshot_id, s.url, s.content_hash, s.captured_at, s.blob_ref,
      di.id AS institution_id, di.name AS institution_name, di.kind AS institution_kind, dof.id AS office_id, dof.title AS office_title,
      p.id AS person_id, p.display_name AS person_name, rev.decision, rev.reviewed_at
    FROM observation o JOIN snapshot s ON s.id = o.snapshot_id
    JOIN delhi_office dof ON dof.observation_id = o.id OR EXISTS (SELECT 1 FROM delhi_appointment da WHERE da.office_id = dof.id AND da.observation_id = o.id)
    JOIN delhi_institution di ON di.id = dof.institution_id
    LEFT JOIN delhi_appointment da ON da.office_id = dof.id AND da.observation_id = o.id
    LEFT JOIN person p ON p.id = da.person_id
    JOIN LATERAL (
      SELECT r.decision, r.reviewed_at FROM review_observation ro JOIN review_event r ON r.id = ro.review_id
      WHERE ro.observation_id = o.id ORDER BY r.sequence DESC LIMIT 1
    ) rev ON rev.decision = 'approved'
    ORDER BY o.recorded_at DESC, o.id DESC
  `);
  const checked = new Map<string, { hash: string; at: string }>();
  const rows: ReviewedDelhiRow[] = [];
  for (const row of result.rows) {
    const definition = delhiSources.find((item) => item.url === row.url);
    if (!definition || !(definition.id in parsers) || !row.blob_ref) continue;
    let check = checked.get(row.snapshot_id);
    if (!check) {
      const bytes = await blobs.get(row.blob_ref);
      const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      if (hash !== row.content_hash) throw new Error("Delhi snapshot hash mismatch");
      const parser = parsers[definition.id as keyof typeof parsers];
      const replay = parser(bytes.toString("utf8"), new Date(row.captured_at).toISOString());
      const saved = await pool.query<{ locator: string; predicate: string; normalized_value: unknown }>("SELECT locator, predicate, normalized_value FROM observation WHERE snapshot_id = $1", [row.snapshot_id]);
      if (replay.length !== saved.rows.length || replay.some((draft) => !saved.rows.some((item) => item.locator === draft.locator && item.predicate === draft.predicate && isDeepStrictEqual(item.normalized_value, draft.normalizedValue)))) throw new Error("Delhi source replay differs from saved observations");
      check = { hash, at: new Date().toISOString() };
      checked.set(row.snapshot_id, check);
    }
    const value = row.normalized_value as Record<string, unknown>;
    rows.push({ observationId: row.observation_id, institutionId: row.institution_id, institutionName: row.institution_name,
      institutionKind: row.institution_kind, officeId: row.office_id, officeTitle: row.office_title,
      ...(row.person_id ? { personId: row.person_id, personName: row.person_name } : {}), status: "source-listed",
      source: { id: definition.id, url: row.url, locator: row.locator, contentHash: row.content_hash, capturedAt: new Date(row.captured_at).toISOString() },
      review: { decision: row.decision, reviewedAt: new Date(row.reviewed_at).toISOString() },
      check: { contentHash: check.hash, checkedAt: check.at }, reuseStatus: definition.reuseStatus,
      contactKind: "official", ...(typeof value.officePhone === "string" ? { officeContact: value.officePhone } : {}) });
  }
  return rows;
}
