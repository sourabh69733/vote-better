import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCandidate, formatNumber, requireResults, seatHref, summaryOf } from "@/lib/results";
import { findCandidacy2024, findMpForSeat } from "@/lib/mp-seat-link";
import { eciChip, partyOf, resultStats, type ProfileModel } from "@/lib/profile-model";
import { getPersonProfile, listPersonSlugs } from "@/lib/verified-profile";
import ProfileView from "@/components/profile/ProfileView";

interface PageProps {
  params: Promise<{ state: string; seat: string; candidate: string }>;
}

// 8,359 candidates: render each profile on first visit, then cache it.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, seat, candidate } = await params;
  const found = findCandidate("lok-sabha-2024", state, seat, candidate);
  if (!found) return { title: "Candidate not found" };
  return {
    title: `${found.candidate.name}, ${found.seat.name} 2024 | Vote Better`,
    description: `${found.candidate.name} (${found.candidate.party}) in ${found.seat.name}, ${found.seat.state}: votes, result and the official ECI source.`,
  };
}

const genderLabel = { female: "Female", male: "Male", third: "Third gender" } as const;
const categoryLabel: Record<string, string> = { GENERAL: "General", SC: "Scheduled Caste", ST: "Scheduled Tribe" };
const day = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function CandidatePage({ params }: PageProps) {
  const { state, seat: seatSlug, candidate: slug } = await params;
  const found = findCandidate("lok-sabha-2024", state, seatSlug, slug);
  if (!found) notFound();
  const { seat, candidate } = found;
  const data = requireResults("lok-sabha-2024");
  const partyName = (code: string) => data.parties[code]?.name ?? code;
  const party = data.parties[candidate.party];
  const won = candidate.rank === 1;
  const eci = eciChip(data, candidate, day(candidate.reviewedAt));
  const curatedPerson = listPersonSlugs().map((item) => getPersonProfile(item)!).find((person) => {
    const row = findCandidacy2024(person.name, person.candidacies[0]?.election);
    return row?.seat.slug === seat.slug && row.seat.stateSlug === seat.stateSlug && row.candidate.slug === candidate.slug;
  });
  const sittingMp = won ? await findMpForSeat(seat) : undefined;
  const namesake = seat.candidates.some((other) => other.slug !== candidate.slug && other.name === candidate.name);

  const model: ProfileModel = {
    name: candidate.name,
    party: partyOf(party?.name ?? candidate.party, candidate.party, candidate.partySymbol),
    role: won ? { label: "Won 2024", tone: "won" } : { label: `Lost · ${candidate.rank} of ${seat.candidates.length}`, tone: "lost" },
    kicker: "Lok Sabha 2024 candidate",
    place: `${seat.name}, ${seat.state} · seat ${seat.number}`,
    headline: summaryOf(seat, candidate, partyName),
    breadcrumb: [{ label: "All seats", href: "/seats" }, { label: seat.name, href: seatHref(seat) }],
    contest: { seat, candidate },
    stats: [
      ...resultStats(seat, candidate, eci),
      ...(candidate.age !== null ? [{ id: "age", label: "Age at election", value: String(candidate.age), note: candidate.gender ? genderLabel[candidate.gender] : undefined, source: eci }] : []),
    ],
    timeline: [{
      when: "2024 · Lok Sabha", strong: won, source: eci,
      text: `${won ? "Won" : "Contested"} ${seat.name} for ${party?.name ?? candidate.party} with ${formatNumber(candidate.votes)} votes.`,
    }],
    facts: [
      ...(party && party.type !== party.name ? [["Party type", party.type] as [string, string]] : []),
      ...(candidate.partySymbol ? [["Election symbol", candidate.partySymbol] as [string, string]] : []),
      ...(candidate.gender ? [["Gender", genderLabel[candidate.gender]] as [string, string]] : []),
      ...(candidate.category ? [["Category", categoryLabel[candidate.category] ?? candidate.category] as [string, string]] : []),
    ],
    links: [],
    related: [
      ...(curatedPerson ? [{ label: "Open the hand-checked profile: affidavit, career and parliamentary work", href: `/people/${curatedPerson.slug}` }] : []),
      ...(sittingMp && !curatedPerson ? [{ label: "Open the full MP profile: career and committees", href: `/mps/${sittingMp.memberId}` }] : []),
    ],
    sources: [],
    coming: ["declared assets and cases", "education", "earlier elections", ...(won ? ["parliamentary work"] : [])],
    ...(namesake ? { warning: `Another candidate in ${seat.name} has the same name. This profile is the ${party?.name ?? candidate.party} candidate.` } : {}),
  };

  return <ProfileView model={model} data={data} />;
}
