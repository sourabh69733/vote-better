import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface DraftMember {
  id: number;
  name: string;
  party: string;
  state: string;
  constituency: string;
  status: string;
  snapshotId: string;
}

export interface ResearchRoster {
  boundaryHash: string;
  members: DraftMember[];
  snapshots: { id: string; url: string; capturedAt: string }[];
  matches: { areaId: string; memberId: number; matchKind: "exact" | "suggested" }[];
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export async function loadResearchRoster(
  path = resolve(process.cwd(), "../data/raw/maps/mp_crosswalk_draft.json"),
): Promise<ResearchRoster | null> {
  let draft: Record<string, unknown> | null;
  try {
    draft = record(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return null;
  }
  if (!draft || draft.schemaVersion !== 1 || draft.reviewStatus !== "unreviewed" ||
      !Array.isArray(draft.members) || !Array.isArray(draft.rosterSnapshots) ||
      !Array.isArray(draft.proposed) || !Array.isArray(draft.suggested)) return null;
  const boundaryHash = record(draft.boundarySource)?.inputSha256;
  if (typeof boundaryHash !== "string") return null;

  const members: DraftMember[] = [];
  for (const raw of draft.members) {
    const member = record(raw);
    if (!member || !Number.isSafeInteger(member.id) || typeof member.name !== "string" ||
        typeof member.party !== "string" || typeof member.state !== "string" ||
        typeof member.constituency !== "string" || member.status !== "Sitting" ||
        typeof member.snapshotId !== "string") return null;
    members.push(member as unknown as DraftMember);
  }
  const snapshots: ResearchRoster["snapshots"] = [];
  for (const raw of draft.rosterSnapshots) {
    const snapshot = record(raw);
    if (!snapshot || typeof snapshot.id !== "string" || typeof snapshot.url !== "string" ||
        !snapshot.url.startsWith("https://sansad.in/api_ls/member?") ||
        typeof snapshot.capturedAt !== "string") return null;
    snapshots.push({ id: snapshot.id, url: snapshot.url, capturedAt: snapshot.capturedAt });
  }
  const matches: ResearchRoster["matches"] = [];
  for (const [items, matchKind] of [[draft.proposed, "exact"], [draft.suggested, "suggested"]] as const) {
    for (const raw of items) {
      const item = record(raw);
      if (!item || typeof item.areaId !== "string" || !Number.isSafeInteger(item.memberId)) return null;
      matches.push({ areaId: item.areaId, memberId: item.memberId as number, matchKind });
    }
  }
  return { boundaryHash, members, snapshots, matches };
}

export function researchMemberForArea(roster: ResearchRoster, areaId: string, boundaryHash: string) {
  if (roster.boundaryHash !== boundaryHash) return undefined;
  const matching = roster.matches.filter((item) => item.areaId === areaId);
  if (matching.length !== 1) return undefined;
  const member = roster.members.find((item) => item.id === matching[0].memberId);
  const snapshot = roster.snapshots.find((item) => item.id === member?.snapshotId);
  if (!member || !snapshot) return undefined;
  return { id: member.id, name: member.name, party: member.party, matchKind: matching[0].matchKind,
    sourceUrl: snapshot.url, capturedAt: snapshot.capturedAt };
}
