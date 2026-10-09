import type pg from "pg";
import { assertSourceTime, type SourceTime } from "../contracts.js";

interface InstitutionDraft { stableKey: string; name: string; kind: "government" | "department" | "police" | "court" | "legal-aid" | "other"; observationId: string }
interface OfficeDraft { stableKey: string; institutionId: string; title: string; observationId: string }
interface AppointmentDraft { officeId: string; personId: string; observationId: string; validFrom?: SourceTime; validTo?: SourceTime }
interface JurisdictionDraft { officeId: string; areaId: string; observationId: string }
interface FacilityDraft { stableKey: string; institutionId: string; name: string; officialAddress?: string; observationId: string }

function required(value: string, label: string): void { if (!value?.trim()) throw new Error(`${label} is required`); }

export class DelhiRegistry {
  constructor(private readonly pool: pg.Pool) {}

  async upsertInstitutionDraft(input: InstitutionDraft): Promise<string> {
    for (const [key, value] of Object.entries(input)) required(value, key);
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO delhi_institution (stable_key, name, kind, observation_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (stable_key) DO NOTHING RETURNING id`,
      [input.stableKey, input.name, input.kind, input.observationId],
    );
    if (result.rows[0]) return result.rows[0].id;
    const previous = await this.pool.query("SELECT * FROM delhi_institution WHERE stable_key = $1", [input.stableKey]);
    const row = previous.rows[0];
    if (row.name !== input.name || row.kind !== input.kind || row.observation_id !== input.observationId) throw new Error("institution draft conflicts with existing evidence");
    return row.id;
  }

  async recordOfficeDraft(input: OfficeDraft): Promise<string> {
    for (const [key, value] of Object.entries(input)) required(value, key);
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO delhi_office (stable_key, institution_id, title, observation_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (stable_key) DO NOTHING RETURNING id`,
      [input.stableKey, input.institutionId, input.title, input.observationId],
    );
    if (result.rows[0]) return result.rows[0].id;
    const previous = await this.pool.query("SELECT * FROM delhi_office WHERE stable_key = $1", [input.stableKey]);
    const row = previous.rows[0];
    if (row.institution_id !== input.institutionId || row.title !== input.title || row.observation_id !== input.observationId) throw new Error("office draft conflicts with existing evidence");
    return row.id;
  }

  async recordAppointmentDraft(input: AppointmentDraft): Promise<string> {
    required(input.officeId, "officeId"); required(input.personId, "personId"); required(input.observationId, "observationId");
    if (input.validFrom) assertSourceTime(input.validFrom);
    if (input.validTo) assertSourceTime(input.validTo);
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO delhi_appointment (office_id, person_id, observation_id, valid_from_value, valid_from_precision, valid_to_value, valid_to_precision)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (office_id, person_id, observation_id) DO NOTHING RETURNING id`,
      [input.officeId, input.personId, input.observationId, input.validFrom?.value ?? null, input.validFrom?.precision ?? null, input.validTo?.value ?? null, input.validTo?.precision ?? null],
    );
    if (result.rows[0]) return result.rows[0].id;
    const previous = await this.pool.query("SELECT * FROM delhi_appointment WHERE office_id = $1 AND person_id = $2 AND observation_id = $3", [input.officeId, input.personId, input.observationId]);
    const row = previous.rows[0];
    if (row.valid_from_value !== (input.validFrom?.value ?? null) || row.valid_from_precision !== (input.validFrom?.precision ?? null) || row.valid_to_value !== (input.validTo?.value ?? null) || row.valid_to_precision !== (input.validTo?.precision ?? null)) throw new Error("appointment draft conflicts with existing evidence");
    return row.id;
  }

  async recordJurisdictionDraft(input: JurisdictionDraft): Promise<string> {
    required(input.officeId, "officeId"); required(input.areaId, "areaId"); required(input.observationId, "observationId");
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO delhi_jurisdiction (office_id, area_id, observation_id) VALUES ($1,$2,$3)
       ON CONFLICT (office_id, area_id, observation_id) DO NOTHING RETURNING id`,
      [input.officeId, input.areaId, input.observationId],
    );
    if (result.rows[0]) return result.rows[0].id;
    const previous = await this.pool.query<{ id: string }>("SELECT id FROM delhi_jurisdiction WHERE office_id = $1 AND area_id = $2 AND observation_id = $3", [input.officeId, input.areaId, input.observationId]);
    return previous.rows[0].id;
  }

  async recordFacilityDraft(input: FacilityDraft): Promise<string> {
    required(input.stableKey, "stableKey"); required(input.institutionId, "institutionId"); required(input.name, "name"); required(input.observationId, "observationId");
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO delhi_facility (stable_key, institution_id, name, official_address, observation_id) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (stable_key) DO NOTHING RETURNING id`,
      [input.stableKey, input.institutionId, input.name, input.officialAddress ?? null, input.observationId],
    );
    if (result.rows[0]) return result.rows[0].id;
    const previous = await this.pool.query("SELECT * FROM delhi_facility WHERE stable_key = $1", [input.stableKey]);
    const row = previous.rows[0];
    if (row.institution_id !== input.institutionId || row.name !== input.name || row.official_address !== (input.officialAddress ?? null) || row.observation_id !== input.observationId) throw new Error("facility draft conflicts with existing evidence");
    return row.id;
  }

  async listDelhiReviewCandidates(): Promise<{ id: string; officeId: string; personId: string; observationId: string; recordedAt: string }[]> {
    const result = await this.pool.query("SELECT id, office_id, person_id, observation_id, recorded_at FROM delhi_appointment ORDER BY recorded_at, id");
    return result.rows.map((row) => ({ id: row.id, officeId: row.office_id, personId: row.person_id, observationId: row.observation_id, recordedAt: row.recorded_at.toISOString() }));
  }
}
