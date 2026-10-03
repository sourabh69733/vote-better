import type { AreaOfficeLink, CivicArea } from "@/lib/civic-area";
import type { PersonProfile } from "@/lib/verified-profile";
import { lokSabhaOffice } from "./offices";

// Checked against the returning officer's 2024 return and Digital Sansad on 2026-10-03.
export const jaipurRuralProfile: PersonProfile = {
  slug: "rao-rajendra-singh",
  name: "Rao Rajendra Singh",
  reviewedOn: "2026-10-03",
  officeTerms: [{
    title: "Member of Parliament, 18th Lok Sabha",
    constituency: "Jaipur Rural",
    state: "Rajasthan",
    party: "Bharatiya Janata Party",
    startedOn: "2024-06",
    statusSourceId: "current-members",
    biographySourceId: "member",
  }],
  candidacies: [{
    election: "Jaipur Rural Lok Sabha, 2024",
    status: "elected",
    resultDate: "2024-06-04",
    votes: 617877,
    sourceId: "election-2024",
  }],
  sources: [
    {
      id: "member",
      title: "Digital Sansad member profile",
      url: "https://sansad.in/ls/members/biography/5632?from=members",
      checkedOn: "2026-10-03",
    },
    {
      id: "current-members",
      title: "Digital Sansad current members",
      url: "https://sansad.in/ls/members?state=Rajasthan",
      checkedOn: "2026-10-03",
    },
    {
      id: "election-2024",
      title: "Rajasthan CEO, Jaipur Rural 2024 return of election (Form 21E)",
      url: "https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-6.pdf",
      checkedOn: "2026-10-03",
    },
  ],
  activities: [],
};

export const jaipurRuralArea: CivicArea = {
  id: "jaipur-rural-lok-sabha",
  name: "Jaipur Rural",
  state: "Rajasthan",
  kind: "parliamentary_constituency",
  label: "Jaipur Rural Lok Sabha constituency",
};

export const jaipurRuralLink: AreaOfficeLink = {
  id: "jaipur-rural-mp-2024",
  areaId: jaipurRuralArea.id,
  officeId: lokSabhaOffice.id,
  personSlug: jaipurRuralProfile.slug,
  relation: "represents",
  startedOn: "2024-06-04",
  reviewedOn: jaipurRuralProfile.reviewedOn,
  areaSourceIds: ["election-2024"],
  holderSourceIds: ["election-2024", "current-members"],
};
