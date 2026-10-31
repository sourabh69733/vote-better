export type UtcInstant = string;
export type Id = string;
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface SourceTime {
  value: string;
  precision: "instant" | "day" | "month" | "year";
  originalText: string;
  sourceTimezone?: string;
}

interface Recorded {
  id: Id;
  // Assigned by the store when the row is first written, never copied from a source.
  recordedAt: UtcInstant;
}

export interface Source extends Recorded {
  authority: string;
  url: string;
  documentType: string;
}

export interface Snapshot extends Recorded {
  sourceId: Id;
  url: string;
  contentHash: string;
  capturedAt: UtcInstant;
  blobRef?: string;
}

export interface Observation extends Recorded {
  snapshotId: Id;
  locator: string;
  predicate: string;
  rawValue: string;
  normalizedValue: JsonValue;
  validFrom?: SourceTime;
  validTo?: SourceTime;
  sourcePublishedAt?: SourceTime;
  normalizedAt: UtcInstant;
  normalizerVersion: string;
}

export interface EntityMatch extends Recorded {
  observationId: Id;
  entityId?: Id;
  status: "proposed" | "confirmed" | "ambiguous" | "rejected";
  reason: string;
}

export interface ReviewDecision extends Recorded {
  observationIds: Id[];
  decision: "approved" | "rejected" | "needs-changes";
  reviewerId: Id;
  reason: string;
  reviewedAt: UtcInstant;
}

export interface PublishedFact extends Recorded {
  entityId: Id;
  predicate: string;
  value: JsonValue;
  observationIds: Id[];
  revisionId: Id;
  publishedAt: UtcInstant;
}

export type CoverageState = "covered" | "partial" | "missing" | "stale" | "disputed" | "not-covered";

export interface CoverageStatus extends Recorded {
  areaId: Id;
  factType: string;
  state: CoverageState;
  reason?: string;
  lastAttemptedAt?: UtcInstant;
  lastCapturedAt?: UtcInstant;
  lastReviewedAt?: UtcInstant;
  lastPublishedAt?: UtcInstant;
}

const utcPattern = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;

export function isUtcInstant(value: unknown): value is UtcInstant {
  return typeof value === "string" && utcPattern.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function requireText(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field} is required`);
}

function requireInstant(value: unknown, field: string): void {
  if (!isUtcInstant(value)) throw new Error(`${field} must be a UTC instant`);
}

function requireRecorded(value: { id?: unknown; recordedAt?: unknown }): void {
  requireText(value.id, "id");
  requireInstant(value.recordedAt, "recordedAt");
}

function dayIsReal(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function assertSourceTime(value: SourceTime): void {
  if (!value || typeof value !== "object") throw new Error("source time is required");
  requireText(value.originalText, "source time originalText");
  if (value.sourceTimezone !== undefined) requireText(value.sourceTimezone, "sourceTimezone");
  switch (value.precision) {
    case "year":
      if (!/^\d{4}$/.test(value.value)) throw new Error("invalid year precision");
      break;
    case "month":
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value.value)) throw new Error("invalid month precision");
      break;
    case "day":
      if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value.value) || !dayIsReal(value.value)) {
        throw new Error("invalid day precision");
      }
      break;
    case "instant":
      if (typeof value.value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value.value) ||
        !dayIsReal(value.value.slice(0, 10)) || Number.isNaN(Date.parse(value.value))) {
        throw new Error("invalid instant precision");
      }
      break;
    default:
      throw new Error("source time precision is required");
  }
}

export function assertSource(value: Source): void {
  if (!value || typeof value !== "object") throw new Error("source is required");
  requireRecorded(value);
  requireText(value.authority, "authority");
  requireText(value.url, "url");
  requireText(value.documentType, "documentType");
  if (!/^https?:$/.test(new URL(value.url).protocol)) throw new Error("source URL must use HTTP(S)");
}

export function assertSnapshot(value: Snapshot): void {
  if (!value || typeof value !== "object") throw new Error("snapshot is required");
  requireRecorded(value);
  requireText(value.sourceId, "sourceId");
  requireText(value.url, "url");
  requireText(value.contentHash, "contentHash");
  if (!/^sha256:[0-9a-f]{64}$/.test(value.contentHash)) throw new Error("contentHash must be SHA-256");
  requireInstant(value.capturedAt, "capturedAt");
}

export function assertEntityMatch(value: EntityMatch): void {
  if (!value || typeof value !== "object") throw new Error("entity match is required");
  requireRecorded(value);
  requireText(value.observationId, "observationId");
  if (!["proposed", "confirmed", "ambiguous", "rejected"].includes(value.status)) throw new Error("match status is required");
  if (value.status === "confirmed") requireText(value.entityId, "entityId");
  requireText(value.reason, "reason");
}

export function assertReviewDecision(value: ReviewDecision): void {
  if (!value || typeof value !== "object") throw new Error("review decision is required");
  requireRecorded(value);
  if (!Array.isArray(value.observationIds) || value.observationIds.length === 0) throw new Error("review decision needs observations");
  for (const id of value.observationIds) requireText(id, "observationId");
  if (!["approved", "rejected", "needs-changes"].includes(value.decision)) throw new Error("review decision is required");
  requireText(value.reviewerId, "reviewerId");
  requireText(value.reason, "reason");
  requireInstant(value.reviewedAt, "reviewedAt");
}

function timeBounds(time: SourceTime): [number, number] {
  if (time.precision === "instant") {
    const exact = Date.parse(time.value);
    return [exact, exact];
  }
  const start = time.precision === "year" ? `${time.value}-01-01` : time.precision === "month" ? `${time.value}-01` : time.value;
  const lower = Date.parse(`${start}T00:00:00.000Z`);
  const upper = time.precision === "year"
    ? Date.UTC(Number(time.value) + 1, 0, 1) - 1
    : time.precision === "month"
      ? Date.UTC(Number(time.value.slice(0, 4)), Number(time.value.slice(5, 7)), 1) - 1
      : lower + 86_400_000 - 1;
  return [lower, upper];
}

export function assertObservation(value: Observation): void {
  if (!value || typeof value !== "object") throw new Error("observation is required");
  requireRecorded(value);
  requireText(value.snapshotId, "snapshotId");
  requireText(value.locator, "locator");
  requireText(value.predicate, "predicate");
  requireText(value.rawValue, "rawValue");
  if (value.normalizedValue === undefined) throw new Error("normalizedValue is required");
  requireInstant(value.normalizedAt, "normalizedAt");
  requireText(value.normalizerVersion, "normalizerVersion");
  if (value.validFrom) assertSourceTime(value.validFrom);
  if (value.validTo) assertSourceTime(value.validTo);
  if (value.sourcePublishedAt) assertSourceTime(value.sourcePublishedAt);
  if (value.validFrom && value.validTo && timeBounds(value.validFrom)[0] > timeBounds(value.validTo)[1]) {
    throw new Error("validTo ends before validFrom begins");
  }
}

export function assertCoverageStatus(value: CoverageStatus): void {
  if (!value || typeof value !== "object") throw new Error("coverage is required");
  requireRecorded(value);
  requireText(value.areaId, "areaId");
  requireText(value.factType, "factType");
  if (!["covered", "partial", "missing", "stale", "disputed", "not-covered"].includes(value.state)) {
    throw new Error("coverage state is required");
  }
  for (const field of ["lastAttemptedAt", "lastCapturedAt", "lastReviewedAt", "lastPublishedAt"] as const) {
    if (value[field] !== undefined) requireInstant(value[field], field);
  }
}

export function assertPublishedFact(value: PublishedFact, decisions: readonly ReviewDecision[]): void {
  if (!value || typeof value !== "object") throw new Error("published fact is required");
  requireRecorded(value);
  requireText(value.entityId, "entityId");
  requireText(value.predicate, "predicate");
  requireText(value.revisionId, "revisionId");
  requireInstant(value.publishedAt, "publishedAt");
  if (value.value === undefined) throw new Error("value is required");
  if (!Array.isArray(value.observationIds) || value.observationIds.length === 0) {
    throw new Error("published fact needs observations");
  }
  for (const observationId of value.observationIds) {
    requireText(observationId, "observationId");
    if (!decisions.some((item) => {
      assertReviewDecision(item);
      return item.decision === "approved" && item.observationIds.includes(observationId) && item.reviewedAt <= value.publishedAt;
    })) {
      throw new Error(`observation ${observationId} has no approval`);
    }
  }
}
