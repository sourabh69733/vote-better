import { dataset } from "@/records/registry";
import type { CandidateDisclosureRecord, CareerEventRecord, PersonBackgroundRecord, SourceRecord, TermRecord } from "./civic-records";

export type { SourceRecord } from "./civic-records";

export interface SourcedActivity {
  date: string;
  title: string;
  description: string;
  sourceId: string;
}

export interface OfficeTerm {
  title: string;
  constituency: string;
  state: string;
  party: string;
  startedOn: string;
  endedOn?: string;
  reviewedOn: string;
  statusSourceId: string;
  biographySourceId: string;
}

export interface ElectionCandidacy {
  election: string;
  status: "applied" | "accepted" | "withdrawn" | "contesting" | "elected" | "not elected";
  resultDate?: string;
  votes?: number;
  sourceId: string;
  party?: string;
}

export interface PublicLifeEvent {
  kind: "election" | "career" | "education" | "party" | "work";
  date: string;
  sortOn: string;
  title: string;
  party?: string;
  sourceId: string;
  selfReported?: boolean;
}

export interface PublicProfileLink {
  sourceId: string;
  label: string;
}

export interface PersonProfile {
  slug: string;
  name: string;
  reviewedOn: string;
  officeTerms: OfficeTerm[];
  candidacies: ElectionCandidacy[];
  sources: SourceRecord[];
  activities: SourcedActivity[];
  disclosures: Omit<CandidateDisclosureRecord, "id" | "personId">[];
  timeline: PublicLifeEvent[];
  publicProfiles: PublicProfileLink[];
  background: Omit<PersonBackgroundRecord, "id" | "personId"> | null;
  career: Omit<CareerEventRecord, "id" | "personId">[];
}

function toOfficeTerm(term: TermRecord): OfficeTerm {
  const area = dataset.areas.find((item) => item.id === term.areaId)!;
  return {
    title: term.title,
    constituency: area.name,
    state: area.state,
    party: term.party,
    startedOn: term.startedOn,
    endedOn: term.endedOn,
    reviewedOn: term.reviewedOn,
    statusSourceId: term.statusSourceId,
    biographySourceId: term.biographySourceId,
  };
}

export function listPersonSlugs(): string[] {
  return dataset.people.map((person) => person.id);
}

export function getPersonProfile(slug: string): PersonProfile | null {
  const person = dataset.people.find((item) => item.id === slug);
  if (!person) return null;

  const terms = dataset.terms.filter((term) => term.personId === slug);
  const candidacies = dataset.candidacies.filter((item) => item.personId === slug);
  const activities = dataset.activities.filter((item) => item.personId === slug);
  const disclosures = dataset.disclosures.filter((item) => item.personId === slug);
  const background = dataset.backgrounds.find((item) => item.personId === slug);
  const career = dataset.careerEvents.filter((item) => item.personId === slug);
  const timeline: PublicLifeEvent[] = [
    ...candidacies.filter((item) => item.resultDate).map((item) => ({ kind: "election" as const, date: item.resultDate!, sortOn: item.resultDate!, title: item.election, party: item.party, sourceId: item.sourceId })),
    ...career.map((event) => ({ kind: event.kind ?? "career", date: event.period, sortOn: event.sortOn, title: event.title, party: event.partyAtEvent, sourceId: event.sourceId, selfReported: event.selfReported })),
  ].sort((a, b) => b.sortOn.localeCompare(a.sortOn));
  const sourceIds = new Set([
    ...terms.flatMap((term) => [...term.areaSourceIds, ...term.holderSourceIds, term.statusSourceId, term.biographySourceId]),
    ...candidacies.map((item) => item.sourceId),
    ...activities.map((item) => item.sourceId),
    ...disclosures.map((item) => item.sourceId),
    ...(background ? [background.sourceId] : []),
    ...career.map((item) => item.sourceId),
  ]);

  return {
    slug: person.id,
    name: person.name,
    reviewedOn: [person.reviewedOn, ...dataset.sources.filter((source) => sourceIds.has(source.id)).map((source) => source.checkedOn)].sort().at(-1)!,
    officeTerms: terms.map(toOfficeTerm),
    candidacies: candidacies.map(({ election, status, resultDate, votes, sourceId, party }) => ({ election, status, resultDate, votes, sourceId, party })),
    sources: dataset.sources.filter((source) => sourceIds.has(source.id)),
    activities: activities.map(({ date, title, description, sourceId }) => ({ date, title, description, sourceId })),
    disclosures: disclosures.map((item) => ({
      election: item.election,
      ageAtFiling: item.ageAtFiling,
      education: item.education,
      declaredCases: item.declaredCases,
      declaredAssetsRupees: item.declaredAssetsRupees,
      declaredLiabilitiesRupees: item.declaredLiabilitiesRupees,
      sourceId: item.sourceId,
    })),
    timeline,
    publicProfiles: [...new Set(terms.map((term) => term.biographySourceId))].map((sourceId) => ({ sourceId, label: "Official profile" })),
    background: background ? {
      educationDetail: background.educationDetail,
      workDescription: background.workDescription,
      context: background.context,
      sourceId: background.sourceId,
    } : null,
    career: career.map(({ kind, title, period, sortOn, partyAtEvent, selfReported, sourceId }) => ({ kind, title, period, sortOn, partyAtEvent, selfReported, sourceId })),
  };
}

export function getProfileSource(profile: PersonProfile, id: string): SourceRecord {
  const source = profile.sources.find((item) => item.id === id);
  if (!source) throw new Error(`Missing source for ${id}`);
  return source;
}
