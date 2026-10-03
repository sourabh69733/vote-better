import { getProfileSource, jaipurProfile, type PersonProfile, type SourceRecord } from "./verified-profile";

export interface CivicArea {
  id: string;
  name: string;
  state: string;
  kind: "parliamentary_constituency";
  label: string;
}

export interface CivicOffice {
  id: string;
  title: string;
  level: "national";
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

const jaipurArea: CivicArea = {
  id: "jaipur-lok-sabha",
  name: "Jaipur",
  state: "Rajasthan",
  kind: "parliamentary_constituency",
  label: "Jaipur Lok Sabha constituency",
};

const lokSabhaOffice: CivicOffice = {
  id: "lok-sabha-member",
  title: "Member of Parliament",
  level: "national",
};

const areas: Record<string, CivicArea> = { [jaipurArea.id]: jaipurArea };
const offices: Record<string, CivicOffice> = { [lokSabhaOffice.id]: lokSabhaOffice };
const people: Record<string, PersonProfile> = { [jaipurProfile.slug]: jaipurProfile };

const areaLinks: AreaOfficeLink[] = [{
  id: "jaipur-mp-2024",
  areaId: jaipurArea.id,
  officeId: lokSabhaOffice.id,
  personSlug: jaipurProfile.slug,
  relation: "represents",
  startedOn: "2024-06-04",
  reviewedOn: jaipurProfile.reviewedOn,
  areaSourceIds: ["election-2024"],
  holderSourceIds: ["election-2024", "current-members"],
}];

export function getAreaOverview(areaId: string): AreaOverview | null {
  const area = areas[areaId];
  if (!area) return null;

  return {
    area,
    links: areaLinks.filter((link) => link.areaId === areaId && !link.endedOn).map((link) => {
      const office = offices[link.officeId];
      const profile = people[link.personSlug];
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
