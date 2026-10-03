import { profiles } from "@/records/registry";

export interface SourceRecord {
  id: string;
  title: string;
  url: string;
  checkedOn: string;
}

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
  statusSourceId: string;
  biographySourceId: string;
}

export interface ElectionCandidacy {
  election: string;
  status: "applied" | "accepted" | "withdrawn" | "contesting" | "elected" | "not elected";
  resultDate?: string;
  votes?: number;
  sourceId: string;
}

export interface PersonProfile {
  slug: string;
  name: string;
  reviewedOn: string;
  officeTerms: OfficeTerm[];
  candidacies: ElectionCandidacy[];
  sources: SourceRecord[];
  activities: SourcedActivity[];
}


export function listPersonSlugs(): string[] {
  return Object.keys(profiles);
}

export function getPersonProfile(slug: string): PersonProfile | null {
  return profiles[slug] ?? null;
}

export function getProfileSource(profile: PersonProfile, id: string): SourceRecord {
  const source = profile.sources.find((item) => item.id === id);
  if (!source) throw new Error(`Missing source for ${id}`);
  return source;
}
