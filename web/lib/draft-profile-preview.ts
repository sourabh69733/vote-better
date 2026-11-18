import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ReviewedFact } from "./reviewed-profile-preview";

export interface DraftFact {
  predicate: string;
  value: string | { title: string; period?: string }[];
  source: { url: string; contentHash: string; capturedAt: string; locator: string };
}

export interface DraftProfilePreview {
  memberId: number;
  personName: string;
  generatedAt: string;
  sourceCheck?: { method: "sansad-snapshot-replay-v1"; checkedAt: string };
  facts: DraftFact[];
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

const fields = new Set(["person.birthDate", "person.educationStatement", "person.profession",
  "person.photoUrl", "person.socialProfile", "office.positionsHeld"]);

export async function loadDraftProfileIds(path?: string): Promise<number[]> {
  if (!path && process.env.NODE_ENV !== "development") return [];
  const file = path ?? resolve(process.cwd(), "../data/raw/profile-drafts/index.json");
  try {
    const index = object(JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8")));
    if (!index || index.schemaVersion !== 1 || index.access !== "local-unverified-profile" ||
        !Array.isArray(index.memberIds) || index.memberIds.some((id) => !Number.isSafeInteger(id) || id < 1) ||
        new Set(index.memberIds).size !== index.memberIds.length) return [];
    return index.memberIds as number[];
  } catch {
    return [];
  }
}

export async function loadDraftProfilePreview(memberId: number, path?: string): Promise<DraftProfilePreview | null> {
  if (!Number.isSafeInteger(memberId) || memberId < 1 || (!path && process.env.NODE_ENV !== "development")) return null;
  if (!path && !(await loadDraftProfileIds()).includes(memberId)) return null;
  const file = path ?? resolve(process.cwd(), `../data/raw/profile-drafts/${memberId}.json`);
  let preview: Record<string, unknown> | null;
  try {
    preview = object(JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8")));
  } catch {
    return null;
  }
  if (!preview || preview.schemaVersion !== 1 || preview.access !== "local-unverified-profile" ||
      preview.memberId !== memberId || typeof preview.personName !== "string" ||
      typeof preview.generatedAt !== "string" || !Array.isArray(preview.facts)) return null;
  const sourceCheck = object(preview.sourceCheck);
  if (preview.sourceCheck !== undefined && (!sourceCheck || sourceCheck.method !== "sansad-snapshot-replay-v1" ||
      typeof sourceCheck.checkedAt !== "string" || Number.isNaN(Date.parse(sourceCheck.checkedAt)))) return null;
  const facts: DraftFact[] = [];
  for (const raw of preview.facts) {
    const fact = object(raw);
    const source = object(fact?.source);
    if (!fact || !source || typeof fact.predicate !== "string" ||
        typeof source.url !== "string" || typeof source.contentHash !== "string" ||
        typeof source.capturedAt !== "string" || typeof source.locator !== "string" ||
        !/^sha256:[0-9a-f]{64}$/.test(source.contentHash)) return null;
    const expectedUrl = fact.predicate === "office.positionsHeld"
      ? `https://sansad.in/api_ls/member/positionHeld?mpCode=${memberId}&locale=en`
      : `https://sansad.in/api_ls/member/${memberId}?locale=en`;
    if (source.url !== expectedUrl) return null;
    if (!fields.has(fact.predicate)) continue;
    if (fact.predicate === "office.positionsHeld") {
      if (!Array.isArray(fact.value) || fact.value.some((value) => {
        const position = object(value);
        return !position || typeof position.title !== "string" ||
          (position.period !== undefined && typeof position.period !== "string");
      })) return null;
    } else if (typeof fact.value !== "string") return null;
    if (fact.predicate === "person.photoUrl" || fact.predicate === "person.socialProfile") {
      try {
        const url = new URL(fact.value as string);
        if (url.protocol !== "https:" || url.username || url.password ||
            (fact.predicate === "person.photoUrl" && url.hostname !== "sansad.in")) return null;
      } catch { return null; }
    }
    facts.push(fact as unknown as DraftFact);
  }
  return { memberId, personName: preview.personName, generatedAt: preview.generatedAt,
    ...(sourceCheck ? { sourceCheck: { method: "sansad-snapshot-replay-v1", checkedAt: sourceCheck.checkedAt as string } as const } : {}), facts };
}

export function isReviewedDraftFact(draft: DraftFact, reviewed: readonly ReviewedFact[]): boolean {
  return reviewed.some((fact) => fact.predicate === draft.predicate &&
    fact.source.contentHash === draft.source.contentHash &&
    fact.source.locator === draft.source.locator &&
    JSON.stringify(fact.value) === JSON.stringify(draft.value));
}
