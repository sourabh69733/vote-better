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

// Curated pilot record. Each displayed fact points to an original public record.
// Review current office and party again before a public launch.
export const jaipurProfile: PersonProfile = {
  slug: "manju-sharma",
  name: "Manju Sharma",
  reviewedOn: "2026-10-02",
  officeTerms: [
    {
      title: "Member of Parliament, 18th Lok Sabha",
      constituency: "Jaipur",
      state: "Rajasthan",
      party: "Bharatiya Janata Party",
      startedOn: "2024-06",
      statusSourceId: "current-members",
      biographySourceId: "member",
    },
  ],
  candidacies: [
    {
      election: "Jaipur Lok Sabha, 2024",
      status: "elected",
      resultDate: "2024-06-04",
      votes: 886850,
      sourceId: "election-2024",
    },
  ],
  sources: [
    {
      id: "member",
      title: "Digital Sansad member profile",
      url: "https://sansad.in/ls/members/biography/5619?from=members",
      checkedOn: "2026-10-02",
    },
    {
      id: "current-members",
      title: "Digital Sansad current members",
      url: "https://sansad.in/ls/members?state=Rajasthan",
      checkedOn: "2026-10-02",
    },
    {
      id: "election-2024",
      title: "Rajasthan CEO, Jaipur 2024 return of election (Form 21E)",
      url: "https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-7.pdf",
      checkedOn: "2026-10-02",
    },
    {
      id: "renewable-question",
      title: "Lok Sabha starred question 375, renewable energy in Rajasthan",
      url: "https://sansad.in/getFile/loksabhaquestions/annex/187/AS375_egQs7l.pdf?source=pqals",
      checkedOn: "2026-10-02",
    },
    {
      id: "fiber-question",
      title: "Lok Sabha unstarred question 4460, optical fibre connectivity",
      url: "https://sansad.in/getFile/loksabhaquestions/annex/185/AU4460_ji5NQi.pdf?source=pqals",
      checkedOn: "2026-10-02",
    },
  ],
  activities: [
    {
      date: "2026-03-18",
      title: "Asked about renewable energy schemes in Rajasthan",
      description:
        "Her question requested details of schemes, spending and beneficiaries, including Jaipur. This records a parliamentary question, not a completed local project.",
      sourceId: "renewable-question",
    },
    {
      date: "2025-08-20",
      title: "Co-asked about optical fibre connectivity",
      description:
        "The question sought connectivity and funding details for Jaipur. It was jointly listed with another MP; no project outcome is attributed to either member here.",
      sourceId: "fiber-question",
    },
  ],
};

export function getProfileSource(profile: PersonProfile, id: string): SourceRecord {
  const source = profile.sources.find((item) => item.id === id);
  if (!source) throw new Error(`Missing source for ${id}`);
  return source;
}
