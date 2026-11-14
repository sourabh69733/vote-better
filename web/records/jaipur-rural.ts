import type { CandidacyRecord, CivicArea, PersonRecord, SourceRecord, TermRecord } from "@/lib/civic-records";
import { lokSabhaOffice } from "./offices";

// Checked against the returning officer's return and Digital Sansad on 2026-10-03.
export const jaipurRuralPerson: PersonRecord = {
  id: "rao-rajendra-singh",
  name: "Rao Rajendra Singh",
  reviewedOn: "2026-10-03",
};

export const jaipurRuralArea: CivicArea = {
  id: "jaipur-rural-lok-sabha",
  name: "Jaipur Rural",
  state: "Rajasthan",
  kind: "parliamentary_constituency",
  label: "Jaipur Rural Lok Sabha constituency",
};

export const jaipurRuralTerm: TermRecord = {
  id: "jaipur-rural-mp-2024",
  personId: jaipurRuralPerson.id,
  officeId: lokSabhaOffice.id,
  areaId: jaipurRuralArea.id,
  title: "Member of Parliament, 18th Lok Sabha",
  party: "Bharatiya Janata Party",
  startedOn: "2024-06-04",
  reviewedOn: jaipurRuralPerson.reviewedOn,
  areaSourceIds: ["jaipur-rural-election-2024"],
  holderSourceIds: ["jaipur-rural-election-2024", "rao-current-members"],
  statusSourceId: "rao-current-members",
  biographySourceId: "rao-member",
};

export const jaipurRuralCandidacies: CandidacyRecord[] = [{
  id: "rao-jaipur-rural-2024",
  personId: jaipurRuralPerson.id,
  election: "Jaipur Rural Lok Sabha, 2024",
  status: "elected",
  resultDate: "2024-06-04",
  votes: 617877,
  sourceId: "jaipur-rural-election-2024",
  areaId: jaipurRuralArea.id,
  party: "Bharatiya Janata Party",
}];

export const jaipurRuralSources: SourceRecord[] = [
  {
    id: "rao-member",
    title: "Digital Sansad member profile",
    url: "https://sansad.in/ls/members/biography/5632?from=members",
    checkedOn: "2026-10-03",
  },
  {
    id: "rao-current-members",
    title: "Digital Sansad current members",
    url: "https://sansad.in/ls/members?state=Rajasthan",
    checkedOn: "2026-10-03",
  },
  {
    id: "jaipur-rural-election-2024",
    title: "Rajasthan CEO, Jaipur Rural 2024 return of election (Form 21E)",
    url: "https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-6.pdf",
    checkedOn: "2026-10-03",
  },
];
