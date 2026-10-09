import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface DelhiPublication {
  schemaVersion: 1;
  audience: "preview" | "production";
  revision: string;
  generatedAt: string;
  institutions: { id: string; name: string; kind: string }[];
  offices: { id: string; institutionId: string; title: string; traceId: string; officeContact?: string }[];
  people: { id: string; name: string }[];
  appointments: { id: string; officeId: string; personId: string; status: "source-listed" | "current" | "former"; traceId: string }[];
  jurisdictions: { id: string; officeId: string; areaId: string; traceId: string }[];
  facilities: { id: string; institutionId: string; name: string; traceId: string }[];
  coverage: { sourceId: string; state: "partial" | "stale" | "missing"; publishedRows: number; lastCapturedAt?: string }[];
  traces: { id: string; observationId: string; sourceId: string; sourceUrl: string; locator: string; contentHash: string; capturedAt: string; checkedAt: string; reviewedAt: string }[];
}

const emptyPublication: DelhiPublication = {
  schemaVersion: 1, audience: "production", revision: `sha256:${"0".repeat(64)}`, generatedAt: "1970-01-01T00:00:00.000Z",
  institutions: [], offices: [], people: [], appointments: [], jurisdictions: [], facilities: [], coverage: [], traces: [],
};

export function validateDelhiPublication(value: unknown): asserts value is DelhiPublication {
  if (!value || typeof value !== "object") throw new Error("invalid Delhi publication");
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1 || !["preview", "production"].includes(String(data.audience)) ||
    !/^sha256:[0-9a-f]{64}$/.test(String(data.revision)) || Number.isNaN(Date.parse(String(data.generatedAt)))) throw new Error("invalid Delhi publication header");
  for (const key of ["institutions", "offices", "people", "appointments", "jurisdictions", "facilities", "coverage", "traces"]) {
    if (!Array.isArray(data[key])) throw new Error(`invalid Delhi publication ${key}`);
  }
  const publication = data as unknown as DelhiPublication;
  const ids = (rows: { id: string }[]) => new Set(rows.map((row) => row.id));
  const institutions = ids(publication.institutions);
  const offices = ids(publication.offices);
  const people = ids(publication.people);
  const traces = ids(publication.traces);
  if (institutions.size !== publication.institutions.length || offices.size !== publication.offices.length || people.size !== publication.people.length || traces.size !== publication.traces.length) throw new Error("duplicate Delhi record ID");
  if (publication.offices.some((office) => !institutions.has(office.institutionId) || !traces.has(office.traceId))) throw new Error("broken office reference");
  if (publication.appointments.some((item) => !offices.has(item.officeId) || !people.has(item.personId) || !traces.has(item.traceId))) throw new Error("broken appointment reference");
  if (publication.jurisdictions.some((item) => !offices.has(item.officeId) || !traces.has(item.traceId)) ||
    publication.facilities.some((item) => !institutions.has(item.institutionId) || !traces.has(item.traceId))) throw new Error("broken graph reference");
  const current = new Set<string>();
  for (const item of publication.appointments) {
    if (item.status !== "current") continue;
    if (current.has(item.officeId)) throw new Error("duplicate current officeholder");
    current.add(item.officeId);
  }
  for (const trace of publication.traces) {
    if (!trace.sourceUrl.startsWith("https://") || !trace.locator || !/^sha256:[0-9a-f]{64}$/.test(trace.contentHash) ||
      Date.parse(trace.checkedAt) < Date.parse(trace.capturedAt) || Date.parse(trace.reviewedAt) < Date.parse(trace.capturedAt)) throw new Error("invalid source trace");
  }
}

export async function loadDelhiPublication(path?: string, audience: "preview" | "production" = process.env.NODE_ENV === "development" ? "preview" : "production"): Promise<DelhiPublication> {
  if (audience === "production" && !path && !process.env.DELHI_PUBLICATION_PATH) return emptyPublication;
  const target = path ?? process.env.DELHI_PUBLICATION_PATH ?? resolve(process.cwd(), "../data/raw/delhi/publication-preview.json");
  let raw: string;
  try { raw = await readFile(target, "utf8"); }
  catch (error) {
    if (!path && (error as NodeJS.ErrnoException).code === "ENOENT") return emptyPublication;
    throw error;
  }
  const parsed: unknown = JSON.parse(raw);
  validateDelhiPublication(parsed);
  if (audience === "production" && parsed.audience === "preview") throw new Error("preview publication cannot be loaded in production");
  return parsed;
}
