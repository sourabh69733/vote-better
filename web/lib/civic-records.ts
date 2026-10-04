export interface SourceRecord {
  id: string;
  title: string;
  url: string;
  checkedOn: string;
}

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

export interface PersonRecord {
  id: string;
  name: string;
  reviewedOn: string;
}

export interface TermRecord {
  id: string;
  personId: string;
  officeId: string;
  areaId: string;
  title: string;
  party: string;
  startedOn: string;
  endedOn?: string;
  reviewedOn: string;
  areaSourceIds: string[];
  holderSourceIds: string[];
  statusSourceId: string;
  biographySourceId: string;
}

export interface CandidacyRecord {
  id: string;
  personId: string;
  election: string;
  status: "applied" | "accepted" | "withdrawn" | "contesting" | "elected" | "not elected";
  resultDate?: string;
  votes?: number;
  sourceId: string;
}

export interface ActivityRecord {
  id: string;
  personId: string;
  date: string;
  title: string;
  description: string;
  sourceId: string;
}

export interface CivicDataset {
  areas: CivicArea[];
  offices: CivicOffice[];
  people: PersonRecord[];
  terms: TermRecord[];
  candidacies: CandidacyRecord[];
  activities: ActivityRecord[];
  sources: SourceRecord[];
}

export function validateCivicDataset(data: CivicDataset): string[] {
  const errors: string[] = [];
  const collections = [data.areas, data.offices, data.people, data.terms, data.candidacies, data.activities, data.sources];
  for (const collection of collections) {
    const seen = new Set<string>();
    for (const record of collection) {
      if (seen.has(record.id)) errors.push(`Duplicate id: ${record.id}`);
      seen.add(record.id);
    }
  }

  const areaIds = new Set(data.areas.map((item) => item.id));
  const officeIds = new Set(data.offices.map((item) => item.id));
  const personIds = new Set(data.people.map((item) => item.id));
  const sourceIds = new Set(data.sources.map((item) => item.id));
  const requireId = (kind: string, id: string, owner: string, ids: Set<string>) => {
    if (!ids.has(id)) errors.push(`${owner} references missing ${kind}: ${id}`);
  };
  const requireSource = (id: string, owner: string) => requireId("source", id, owner, sourceIds);

  for (const source of data.sources) {
    if (!/^https:\/\//.test(source.url)) errors.push(`Source ${source.id} needs an HTTPS URL`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedOn)) errors.push(`Source ${source.id} needs a checked date`);
  }

  const currentSeats = new Set<string>();
  for (const term of data.terms) {
    requireId("person", term.personId, term.id, personIds);
    requireId("office", term.officeId, term.id, officeIds);
    requireId("area", term.areaId, term.id, areaIds);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(term.reviewedOn)) errors.push(`Term ${term.id} needs a review date`);
    if (!term.areaSourceIds.length || !term.holderSourceIds.length) errors.push(`Term ${term.id} needs area and holder evidence`);
    for (const id of [...term.areaSourceIds, ...term.holderSourceIds, term.statusSourceId, term.biographySourceId]) requireSource(id, term.id);
    if (!term.endedOn) {
      const seat = `${term.areaId}:${term.officeId}`;
      if (currentSeats.has(seat)) errors.push(`Multiple current holders for ${seat}`);
      currentSeats.add(seat);
    }
  }

  for (const candidacy of data.candidacies) {
    requireId("person", candidacy.personId, candidacy.id, personIds);
    requireSource(candidacy.sourceId, candidacy.id);
  }
  for (const activity of data.activities) {
    requireId("person", activity.personId, activity.id, personIds);
    requireSource(activity.sourceId, activity.id);
  }
  return errors;
}
