import { areas, offices, areaLinks } from "@/records/registry";
import { getPersonProfile, getProfileSource, type SourceRecord } from "./verified-profile";

export interface CivicArea {
  id: string;
  name: string;
  state: string;
  kind: "parliamentary_constituency" | "assembly_constituency" | "ward";
  label: string;
}

export interface CivicOffice {
  id: string;
  title: string;
  level: "national" | "state" | "local";
}

export interface AreaOfficeLink {
  id: string;
  areaId: string;
  officeId: string;
  personSlug: string;
  relation: "represents";
  startedOn: string;
  endedOn?: string;
  reviewedOn: string;
  areaSourceIds: string[];
  holderSourceIds: string[];
}

export interface ResolvedAreaLink extends AreaOfficeLink {
  office: CivicOffice;
  person: { name: string; slug: string };
  sources: SourceRecord[];
  areaSources: SourceRecord[];
  holderSources: SourceRecord[];
}

export interface AreaOverview {
  area: CivicArea;
  links: ResolvedAreaLink[];
}

export function getAreaOverview(areaId: string): AreaOverview | null {
  const area = areas[areaId];
  if (!area) return null;

  return {
    area,
    links: areaLinks.filter((link) => link.areaId === areaId && !link.endedOn).map((link) => {
      const office = offices[link.officeId];
      const profile = getPersonProfile(link.personSlug);
      if (!office || !profile) throw new Error(`Unresolved civic link ${link.id}`);
      return {
        ...link,
        office,
        person: { name: profile.name, slug: profile.slug },
        sources: [...new Set([...link.areaSourceIds, ...link.holderSourceIds])].map((id) => getProfileSource(profile, id)),
        areaSources: link.areaSourceIds.map((id) => getProfileSource(profile, id)),
        holderSources: link.holderSourceIds.map((id) => getProfileSource(profile, id)),
      };
    }),
  };
}

export function listAreaOverviews(): AreaOverview[] {
  return Object.keys(areas).map((id) => getAreaOverview(id)!);
}

export function getAreaForPerson(slug: string): CivicArea | null {
  const link = areaLinks.find((item) => item.personSlug === slug && !item.endedOn);
  return link ? areas[link.areaId] ?? null : null;
}
