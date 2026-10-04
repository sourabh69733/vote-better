import { dataset } from "@/records/registry";
import type { CivicArea, CivicOffice, SourceRecord, TermRecord } from "./civic-records";

export type { CivicArea, CivicOffice } from "./civic-records";

export interface ResolvedAreaLink {
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

function source(id: string): SourceRecord {
  return dataset.sources.find((item) => item.id === id)!;
}

function resolveTerm(term: TermRecord): ResolvedAreaLink {
  const office = dataset.offices.find((item) => item.id === term.officeId)!;
  const person = dataset.people.find((item) => item.id === term.personId)!;
  const sourceIds = new Set([...term.areaSourceIds, ...term.holderSourceIds]);
  return {
    id: term.id,
    areaId: term.areaId,
    officeId: term.officeId,
    personSlug: term.personId,
    relation: "represents",
    startedOn: term.startedOn,
    endedOn: term.endedOn,
    reviewedOn: term.reviewedOn,
    areaSourceIds: term.areaSourceIds,
    holderSourceIds: term.holderSourceIds,
    office,
    person: { name: person.name, slug: person.id },
    sources: [...sourceIds].map(source),
    areaSources: term.areaSourceIds.map(source),
    holderSources: term.holderSourceIds.map(source),
  };
}

export function getAreaOverview(areaId: string): AreaOverview | null {
  const area = dataset.areas.find((item) => item.id === areaId);
  if (!area) return null;
  return {
    area,
    links: dataset.terms.filter((term) => term.areaId === areaId && !term.endedOn).map(resolveTerm),
  };
}

export function listAreaOverviews(): AreaOverview[] {
  return dataset.areas.map((area) => getAreaOverview(area.id)!);
}

export function getAreaForPerson(slug: string): CivicArea | null {
  const term = dataset.terms.find((item) => item.personId === slug && !item.endedOn);
  return term ? dataset.areas.find((area) => area.id === term.areaId) ?? null : null;
}
