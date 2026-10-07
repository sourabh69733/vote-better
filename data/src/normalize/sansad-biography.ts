import { isUtcInstant, type Snapshot, type SourceTime } from "../contracts.js";
import { assertProfileDrafts, type ProfilePredicate } from "../profile-fields.js";
import type { ObservationDraft } from "../store.js";

export const SANSAD_BIOGRAPHY_NORMALIZER_VERSION = "sansad-ls-biography-v1";
export const SANSAD_POSITIONS_NORMALIZER_VERSION = "sansad-ls-positions-v1";

const months: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};
const fullMonths: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function memberUrl(snapshot: Snapshot, memberId: number, kind: "biography" | "positions"): void {
  if (!Number.isSafeInteger(memberId) || memberId < 1) throw new Error("invalid member ID");
  const url = new URL(snapshot.url);
  if (url.origin !== "https://sansad.in" || url.searchParams.get("locale") !== "en" ||
      (kind === "biography"
        ? url.pathname !== `/api_ls/member/${memberId}`
        : url.pathname !== "/api_ls/member/positionHeld" || url.searchParams.get("mpCode") !== String(memberId))) {
    throw new Error("source URL does not match member ID");
  }
}

function sourceDay(value: string): SourceTime | undefined {
  const match = /^(\d{1,2})-([A-Z][a-z]{2})-(\d{4})$/.exec(value);
  if (!match || !months[match[2]]) return undefined;
  const date = `${match[3]}-${String(months[match[2]]).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return undefined;
  return { value: date, precision: "day", originalText: value };
}

function periodStart(period: string): SourceTime | undefined {
  const day = /^(\d{1,2}-[A-Z][a-z]{2}-\d{4})(?:\s|$)/.exec(period);
  if (day) return sourceDay(day[1]);
  const month = /^([A-Z][a-z]+) (\d{4})(?:\s|$)/.exec(period);
  if (month && fullMonths[month[1]]) {
    return { value: `${month[2]}-${String(fullMonths[month[1]]).padStart(2, "0")}`,
      precision: "month", originalText: `${month[1]} ${month[2]}` };
  }
  return undefined;
}

function plainText(html: string): string {
  return html.replace(/<br\s*\/?\s*>/gi, "; ").replace(/<[^>]*>/g, "")
    .replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&#39;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/\s*;\s*/g, "; ").replace(/\s+/g, " ").trim();
}

function httpsUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname && !url.username && !url.password) return url.toString();
  } catch {
    // An optional link can be absent from the profile when the source value is unusable.
  }
  return undefined;
}

export function normalizeSansadBiography(
  snapshot: Snapshot, input: unknown, memberId: number, normalizedAt: string,
): ObservationDraft[] {
  memberUrl(snapshot, memberId, "biography");
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be UTC");
  const record = object(input, "biography");
  if (record.mpsno !== memberId) throw new Error("biography member ID differs from source URL");
  const drafts: ObservationDraft[] = [];
  const add = (field: string, predicate: ProfilePredicate, value: unknown, normalized?: ObservationDraft["normalizedValue"]): void => {
    const rawValue = text(value);
    if (!rawValue) return;
    drafts.push({ locator: `member[mpsno=${memberId}].${field}`, predicate, rawValue,
      normalizedValue: normalized ?? rawValue, normalizedAt, normalizerVersion: SANSAD_BIOGRAPHY_NORMALIZER_VERSION });
  };
  add("mpsno", "person.sansadMemberId", String(memberId));
  add("fullName", "person.name", record.fullName);
  const birth = text(record.dateOfBirth);
  if (birth) {
    const parsed = sourceDay(birth);
    if (!parsed) throw new Error("invalid birth date");
    add("dateOfBirth", "person.birthDate", birth, parsed.value);
  }
  add("mainProfessionName", "person.profession", record.mainProfessionName);
  const education = text(record.education);
  if (education && plainText(education)) add("education", "person.educationStatement", education, plainText(education));
  const photo = text(record.photoUrl);
  if (photo) {
    const url = httpsUrl(photo);
    if (url && new URL(url).hostname === "sansad.in") add("photoUrl", "person.photoUrl", photo, url);
  }
  for (const field of ["facebook", "twitter", "instagram", "linkedIn"] as const) {
    const link = text(record[field]);
    if (link) {
      const url = httpsUrl(link);
      if (url) add(field, "person.socialProfile", link, url);
    }
  }
  assertProfileDrafts("official-biography", drafts);
  return drafts;
}

export function normalizeSansadPositions(
  snapshot: Snapshot, input: unknown, memberId: number, normalizedAt: string,
): ObservationDraft[] {
  memberUrl(snapshot, memberId, "positions");
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be UTC");
  if (!Array.isArray(input) || input.length > 200) throw new Error("positions must be an array of at most 200 rows");
  const drafts = input.map((entry, index): ObservationDraft => {
    const row = object(entry, `position ${index}`);
    const title = text(row.positionHeld);
    const period = text(row.period);
    if (!title || !period) throw new Error(`positionHeld and period required at row ${index}`);
    return { locator: `member[mpsno=${memberId}].positions[${index}]`, predicate: "office.positionHeld",
      rawValue: `${period} | ${title}`, normalizedValue: { title, period },
      validFrom: periodStart(period), normalizedAt, normalizerVersion: SANSAD_POSITIONS_NORMALIZER_VERSION };
  });
  assertProfileDrafts("official-biography", drafts);
  return drafts;
}
