import imported from "@/records/imported/mplads-works.json";

// MP Local Area Development Scheme (MPLADS) works, collected from MoSPI's eSAKSHI dashboard
// by `npm --prefix data run import:mplads-works`.

export type Milestone = "recommended" | "sanctioned" | "completed";

export interface FundWork {
  id: number;
  code: string | null;
  activity: string;
  description: string | null;
  category: string | null;
  districtAuthority: string;
  implementingAgency: string | null;
  stage: string | null;
  milestone: Milestone;
  recommended: { on: string; amount: number } | null;
  sanctioned: { on: string; amount: number } | null;
  completed: { on: string; amount: number } | null;
  paid: number;
  paymentPending: number;
}

interface FundMember {
  personId: string;
  officialName: string;
  constituency: string;
  tenure: string;
  tenureStart: string;
  allocated: number;
  totals: Record<"recommended" | "sanctioned" | "completed" | "payments", { count: number; amount: number }>;
  works: FundWork[];
}

export interface FundPublication {
  collectedAt: string;
  source: { title: string; publisher: string; url: string };
  members: FundMember[];
}

// Each step names who acted, so a badge never claims more than the record shows.
// A fourth step, a check on the ground, is not shown until someone does one.
export const MILESTONES: { id: Milestone; label: string; who: string }[] = [
  { id: "recommended", label: "Recommended", who: "The MP asked for it" },
  { id: "sanctioned", label: "Sanctioned", who: "The district approved it" },
  { id: "completed", label: "Completed", who: "The agency marked it done" },
];

export function summarizeFunds(publication: FundPublication, personId: string) {
  const member = publication.members.find((item) => item.personId === personId);
  if (!member) return null;
  const count = (milestone: Milestone) => member.works.filter((work) => work.milestone === milestone).length;
  return {
    ...member,
    // Furthest step reached, so the three counts add up to every work.
    reached: { recommended: count("recommended"), sanctioned: count("sanctioned"), completed: count("completed") },
    paid: member.works.reduce((sum, work) => sum + work.paid, 0),
    collectedOn: publication.collectedAt.slice(0, 10),
    source: publication.source,
  };
}

export type MpFunds = NonNullable<ReturnType<typeof summarizeFunds>>;

export function getMpFunds(personId: string) {
  return summarizeFunds(imported as FundPublication, personId);
}

// The first of an area's office holders whose fund works have been collected.
export function firstWithFunds<P extends { slug: string }>(people: P[]) {
  for (const person of people) {
    const funds = getMpFunds(person.slug);
    if (funds) return { person, funds };
  }
  return null;
}
