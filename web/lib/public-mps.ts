import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface PublicMpFact {
  predicate: string;
  value: string | { title: string; period?: string; validFrom?: { value: string; precision: string } }[];
  source: { url: string; contentHash: string; capturedAt: string; locator: string };
}

export interface PublicMp {
  memberId: number;
  name: string;
  party: string;
  constituency: string;
  state: string;
  membershipStatus: string;
  rosterSource: { url: string; contentHash: string; capturedAt: string };
  sourceCheckedAt: string;
  facts: PublicMpFact[];
}

function validProfile(value: PublicMp): boolean {
  return Number.isSafeInteger(value.memberId) && value.memberId > 0 &&
    value.name.length > 0 && value.constituency.length > 0 && value.state.length > 0 &&
    value.rosterSource.url.startsWith("https://sansad.in/api_ls/member?") &&
    !Number.isNaN(Date.parse(value.rosterSource.capturedAt)) &&
    !Number.isNaN(Date.parse(value.sourceCheckedAt)) && Array.isArray(value.facts);
}

export async function listPublicMps(path?: string): Promise<readonly PublicMp[]> {
  if (!path && process.env.NODE_ENV !== "development") return [];
  const file = path ?? resolve(process.cwd(), "../data/raw/public-profiles/sansad-mps.json");
  try {
    const records = JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8"));
    const profiles = records.profiles as PublicMp[];
    if (records.schemaVersion !== 1 || records.sourceLabel !== "Digital Sansad" ||
        !Array.isArray(profiles) || new Set(profiles.map((profile) => profile.memberId)).size !== profiles.length ||
        !profiles.every(validProfile)) return [];
    return profiles;
  } catch {
    return [];
  }
}

export async function getPublicMp(memberId: number, path?: string): Promise<PublicMp | undefined> {
  return (await listPublicMps(path)).find((profile) => profile.memberId === memberId);
}

export function publicMpFact(profile: PublicMp, predicate: string): PublicMpFact | undefined {
  return profile.facts.find((fact) => fact.predicate === predicate);
}
