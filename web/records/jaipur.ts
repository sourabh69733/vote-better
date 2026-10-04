import type { ActivityRecord, CandidacyRecord, CivicArea, PersonRecord, SourceRecord, TermRecord } from "@/lib/civic-records";
import { lokSabhaOffice } from "./offices";

// Curated records. Review current office and party again before a public launch.
export const jaipurPerson: PersonRecord = {
  id: "manju-sharma",
  name: "Manju Sharma",
  reviewedOn: "2026-10-02",
};

export const jaipurArea: CivicArea = {
  id: "jaipur-lok-sabha",
  name: "Jaipur",
  state: "Rajasthan",
  kind: "parliamentary_constituency",
  label: "Jaipur Lok Sabha constituency",
};

export const jaipurTerm: TermRecord = {
  id: "jaipur-mp-2024",
  personId: jaipurPerson.id,
  officeId: lokSabhaOffice.id,
  areaId: jaipurArea.id,
  title: "Member of Parliament, 18th Lok Sabha",
  party: "Bharatiya Janata Party",
  startedOn: "2024-06-04",
  reviewedOn: jaipurPerson.reviewedOn,
  areaSourceIds: ["jaipur-election-2024"],
  holderSourceIds: ["jaipur-election-2024", "manju-current-members"],
  statusSourceId: "manju-current-members",
  biographySourceId: "manju-member",
};

export const jaipurCandidacies: CandidacyRecord[] = [{
  id: "manju-jaipur-2024",
  personId: jaipurPerson.id,
  election: "Jaipur Lok Sabha, 2024",
  status: "elected",
  resultDate: "2024-06-04",
  votes: 886850,
  sourceId: "jaipur-election-2024",
}];

export const jaipurSources: SourceRecord[] = [
  {
    id: "manju-member",
    title: "Digital Sansad member profile",
    url: "https://sansad.in/ls/members/biography/5619?from=members",
    checkedOn: "2026-10-02",
  },
  {
    id: "manju-current-members",
    title: "Digital Sansad current members",
    url: "https://sansad.in/ls/members?state=Rajasthan",
    checkedOn: "2026-10-02",
  },
  {
    id: "jaipur-election-2024",
    title: "Rajasthan CEO, Jaipur 2024 return of election (Form 21E)",
    url: "https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-7.pdf",
    checkedOn: "2026-10-02",
  },
  {
    id: "manju-renewable-question",
    title: "Lok Sabha starred question 375, renewable energy in Rajasthan",
    url: "https://sansad.in/getFile/loksabhaquestions/annex/187/AS375_egQs7l.pdf?source=pqals",
    checkedOn: "2026-10-02",
  },
  {
    id: "manju-fiber-question",
    title: "Lok Sabha unstarred question 4460, optical fibre connectivity",
    url: "https://sansad.in/getFile/loksabhaquestions/annex/185/AU4460_ji5NQi.pdf?source=pqals",
    checkedOn: "2026-10-02",
  },
];

export const jaipurActivities: ActivityRecord[] = [
  {
    id: "manju-renewable-2026",
    personId: jaipurPerson.id,
    date: "2026-03-18",
    title: "Asked about renewable energy schemes in Rajasthan",
    description: "Her question requested details of schemes, spending and beneficiaries, including Jaipur. This records a parliamentary question, not a completed local project.",
    sourceId: "manju-renewable-question",
  },
  {
    id: "manju-fiber-2025",
    personId: jaipurPerson.id,
    date: "2025-08-20",
    title: "Co-asked about optical fibre connectivity",
    description: "The question sought connectivity and funding details for Jaipur. It was jointly listed with another MP; no project outcome is attributed to either member here.",
    sourceId: "manju-fiber-question",
  },
];
