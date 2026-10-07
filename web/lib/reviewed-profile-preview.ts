import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface ReviewedFact {
  predicate: string;
  value: string | { title: string; period: string; validFrom?: { value: string; precision: string } }[];
  reviewedAt: string;
  source: { url: string; contentHash: string; capturedAt: string; locator: string };
}

export interface ReviewedProfilePreview {
  memberId: number;
  personKey: string | null;
  personName: string;
  reviewStatus: "unreviewed" | "partial" | "complete";
  generatedAt: string;
  facts: ReviewedFact[];
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

const visibleFields = new Set(["person.birthDate", "person.educationStatement", "person.profession", "office.positionsHeld"]);

export async function loadReviewedProfilePreview(
  memberId: number,
  path?: string,
): Promise<ReviewedProfilePreview | null> {
  if (!Number.isSafeInteger(memberId) || memberId < 1 || (!path && process.env.NODE_ENV !== "development")) return null;
  const file = path ?? resolve(process.cwd(), `../data/raw/profile-previews/${memberId}.json`);
  let preview: Record<string, unknown> | null;
  try {
    preview = object(JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8")));
  } catch {
    return null;
  }
  if (!preview || preview.schemaVersion !== 1 || preview.access !== "local-review-preview" ||
      preview.memberId !== memberId || typeof preview.personName !== "string" ||
      (preview.personKey !== null && typeof preview.personKey !== "string") ||
      !["unreviewed", "partial", "complete"].includes(String(preview.reviewStatus)) ||
      typeof preview.generatedAt !== "string" || !Array.isArray(preview.facts)) return null;
  const facts: ReviewedFact[] = [];
  for (const raw of preview.facts) {
    const fact = object(raw);
    const source = object(fact?.source);
    if (!fact || !source || typeof fact.predicate !== "string" || typeof fact.reviewedAt !== "string" ||
        typeof source.url !== "string" || typeof source.locator !== "string" ||
        typeof source.capturedAt !== "string" || typeof source.contentHash !== "string" ||
        !/^sha256:[0-9a-f]{64}$/.test(source.contentHash)) return null;
    const expectedUrl = fact.predicate === "office.positionsHeld"
      ? `https://sansad.in/api_ls/member/positionHeld?mpCode=${memberId}&locale=en`
      : `https://sansad.in/api_ls/member/${memberId}?locale=en`;
    if (source.url !== expectedUrl) return null;
    if (!visibleFields.has(fact.predicate)) continue;
    if (fact.predicate === "office.positionsHeld") {
      if (!Array.isArray(fact.value) || fact.value.some((value) => {
        const position = object(value);
        return !position || typeof position.title !== "string" || typeof position.period !== "string";
      })) return null;
    } else if (typeof fact.value !== "string") return null;
    facts.push(fact as unknown as ReviewedFact);
  }
  return { memberId, personKey: preview.personKey as string | null,
    personName: preview.personName, reviewStatus: preview.reviewStatus as ReviewedProfilePreview["reviewStatus"],
    generatedAt: preview.generatedAt, facts };
}
