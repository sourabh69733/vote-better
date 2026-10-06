import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getAreaOverview } from "./civic-area";
import { loadResearchRoster, researchMemberForArea } from "./research-roster";

const publishedAreaIds: Record<string, string> = {
  "806": "jaipur-rural-lok-sabha",
  "807": "jaipur-lok-sabha",
};

interface ResearchArea {
  id: string;
  label: string;
  state: string;
  published?: {
    areaId: string;
    holders: { name: string; slug: string; office: string; reviewedOn: string }[];
  };
  draftMember?: ReturnType<typeof researchMemberForArea>;
}

export type ResearchPinLookup =
  | { status: "invalid" | "unavailable" | "not-covered" | "no-match" }
  | { status: "possible"; areas: ResearchArea[]; reviewStatus: "unreviewed"; generatedAt: string };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function publishedArea(id: string, label: string, state: string): ResearchArea["published"] {
  const areaId = publishedAreaIds[id];
  if (!areaId) return undefined;
  const overview = getAreaOverview(areaId);
  if (!overview || overview.area.kind !== "parliamentary_constituency" ||
      overview.area.name.toUpperCase() !== label.toUpperCase() ||
      overview.area.state.toUpperCase() !== state.toUpperCase()) return undefined;
  return {
    areaId,
    holders: overview.links.filter((link) => link.officeId === "lok-sabha-member").map((link) => ({
      name: link.person.name, slug: link.person.slug, office: link.office.title, reviewedOn: link.reviewedOn,
    })),
  };
}

export async function lookupResearchPin(
  pin: string,
  path = resolve(process.cwd(), "../data/raw/maps/pin_candidates_draft.json"),
  rosterPath = resolve(process.cwd(), "../data/raw/maps/mp_crosswalk_draft.json"),
): Promise<ResearchPinLookup> {
  if (!/^[0-9]{6}$/.test(pin)) return { status: "invalid" };
  let document: Record<string, unknown> | null;
  try {
    document = record(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return { status: "unavailable" };
  }
  if (!document || document.reviewStatus !== "unreviewed" || typeof document.generatedAt !== "string") {
    return { status: "unavailable" };
  }
  const pins = record(document.pins);
  const areas = record(document.areas);
  const boundaryHash = record(record(document.sources)?.areas)?.inputSha256;
  const roster = typeof boundaryHash === "string" ? await loadResearchRoster(rosterPath) : null;
  if (!pins || !areas) return { status: "unavailable" };
  const match = record(pins[pin]);
  if (!match) return { status: "not-covered" };
  if (match.status === "no-match") return { status: "no-match" };
  if (!Array.isArray(match.possibleAreaIds) || match.possibleAreaIds.length === 0) return { status: "unavailable" };
  const possible: ResearchArea[] = [];
  for (const id of match.possibleAreaIds) {
    if (typeof id !== "string") return { status: "unavailable" };
    const detail = record(areas[id]);
    if (!detail || typeof detail.label !== "string" || typeof detail.state !== "string") return { status: "unavailable" };
    const published = publishedArea(id, detail.label, detail.state);
    possible.push({ id, label: detail.label, state: detail.state, published,
      draftMember: !published && roster && typeof boundaryHash === "string"
        ? researchMemberForArea(roster, id, boundaryHash) : undefined });
  }
  return { status: "possible", areas: possible, reviewStatus: "unreviewed", generatedAt: document.generatedAt };
}
