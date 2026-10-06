import { isUtcInstant, type Snapshot } from "../contracts.js";
import type { ObservationDraft } from "../store.js";

export const SANSAD_MEMBERS_NORMALIZER_VERSION = "sansad-ls-members-v1";

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error(`${label} must be a positive integer`);
  return value as number;
}

function required(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

export interface SansadPage {
  page: number;
  totalPages: number;
  totalElements: number;
  memberIds: number[];
  drafts: ObservationDraft[];
}

export function parseSansadMembersPage(snapshot: Snapshot, input: unknown, normalizedAt: string): SansadPage {
  if (!isUtcInstant(normalizedAt)) throw new Error("normalizedAt must be a UTC instant");
  const root = object(input, "Sansad response");
  const metadata = object(root.metaDatasDto, "metaDatasDto");
  const page = positiveInteger(metadata.currentPageNumber, "currentPageNumber");
  const totalPages = positiveInteger(metadata.totalPages, "totalPages");
  const totalElements = positiveInteger(metadata.totalElements, "totalElements");
  if (page > totalPages || !Array.isArray(root.membersDtoList) || root.membersDtoList.length === 0 ||
      root.membersDtoList.length > totalElements || (totalPages === 1 && root.membersDtoList.length !== totalElements)) {
    throw new Error("incomplete or invalid Sansad member page");
  }
  const urlPage = new URL(snapshot.url).searchParams.get("page");
  if (urlPage !== null && Number(urlPage) !== page) throw new Error("response page differs from requested page");

  const memberIds = new Set<number>();
  const drafts: ObservationDraft[] = [];
  for (const rawMember of root.membersDtoList) {
    const member = object(rawMember, "member");
    const id = positiveInteger(member.mpsno, "mpsno");
    if (memberIds.has(id)) throw new Error(`duplicate member ID ${id}`);
    memberIds.add(id);
    const base = `membersDtoList[mpsno=${id}]`;
    const add = (field: string, predicate: string, value: unknown, normalized?: ObservationDraft["normalizedValue"]): void => {
      if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return;
      const rawValue = required(value, `${field} for member ${id}`);
      drafts.push({ locator: `${base}.${field}`, predicate, rawValue,
        normalizedValue: normalized ?? rawValue, normalizedAt, normalizerVersion: SANSAD_MEMBERS_NORMALIZER_VERSION });
    };
    add("mpsno", "person.sansadMemberId", String(id));
    add("mpFirstLastName", "person.name", member.mpFirstLastName);
    add("partyFname", "office.party", member.partyFname);
    add("stateName", "office.state", member.stateName);
    add("constName", "office.constituency", member.constName);
    add("status", "office.membershipStatus", member.status);
    add("qualification", "person.educationLevel", member.qualification);
    add("profession", "person.profession", member.profession);
    add("lsExpr", "office.lokSabhaTerms", member.lsExpr);
    if (typeof member.dob === "string" && member.dob.trim()) {
      const raw = member.dob.trim();
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
      const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : raw;
      const parsed = new Date(`${iso}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== iso) throw new Error(`invalid birth date for member ${id}`);
      add("dob", "person.birthDate", member.dob, iso);
    }
    for (const field of ["mpFirstLastName", "partyFname", "stateName", "constName", "status"] as const) {
      required(member[field], `${field} for member ${id}`);
    }
  }
  return { page, totalPages, totalElements, memberIds: [...memberIds], drafts };
}

export function normalizeSansadMembers(snapshot: Snapshot, input: unknown, normalizedAt: string): ObservationDraft[] {
  return parseSansadMembersPage(snapshot, input, normalizedAt).drafts;
}
