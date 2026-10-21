import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listAreaOverviews } from "@/lib/civic-area";
import { formatNumber, getCandidate, loadLokSabha2024, seatHref, summaryOf } from "@/lib/lok-sabha-2024";
import { findMpForSeat } from "@/lib/mp-seat-link";
import { Card, FactList, ProfileHeader, SeatResultBars, Tile, Timeline } from "@/components/profile/ProfileParts";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import type { ChipSource } from "@/components/profile/SourceChip";
import SourceNote from "../../../SourceNote";

interface PageProps {
  params: Promise<{ state: string; seat: string; candidate: string }>;
}

// 8,359 candidates: render each profile on first visit, then cache it.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, seat, candidate } = await params;
  const found = getCandidate(state, seat, candidate);
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
  const found = getCandidate(state, seatSlug, slug);
  if (!found) notFound();
  const { seat, candidate } = found;
  const data = loadLokSabha2024();
  const partyName = (code: string) => data.parties[code]?.name ?? code;
  const party = data.parties[candidate.party];
  const won = candidate.rank === 1;
  const namesake = seat.candidates.some((other) => other.slug !== candidate.slug && other.name === candidate.name);
  const curatedPerson = won
    ? listAreaOverviews().flatMap(({ links }) => links).find((link) => link.person.name.toLowerCase() === candidate.name.toLowerCase())?.person
    : undefined;
  const sittingMp = won ? await findMpForSeat(seat) : undefined;
  const eci: ChipSource = {
    label: "ECI", title: "ECI 2024 results, report 33", url: data.source.url,
    locator: candidate.locator.toLowerCase(), checkedOn: day(candidate.reviewedAt),
  };
  const affidavitPending = "From the 2024 affidavit";

  const story = (
    <div className="grid gap-4">
      <Card title="Timeline">
        <Timeline
          items={[{
            when: "2024 · Lok Sabha", strong: won, source: eci,
            text: `${won ? "Won" : "Contested"} ${seat.name}, ${seat.state} for ${party?.name ?? candidate.party}. ${formatNumber(candidate.votes)} votes, ${candidate.shareOfValidVotes.toFixed(2)}%.`,
          }]}
          gap="Earlier elections, offices and career are not collected yet."
        />
      </Card>
      <Card title="Who they are">
        <FactList facts={[
          ["Party", party?.name ?? candidate.party],
          ...(party && party.type !== party.name ? [["Party type", party.type] as [string, string]] : []),
          ...(candidate.partySymbol ? [["Election symbol", candidate.partySymbol] as [string, string]] : []),
          ["Gender", candidate.gender ? genderLabel[candidate.gender] : "Not stated"],
          ["Category", candidate.category ? categoryLabel[candidate.category] ?? candidate.category : "Not stated"],
        ]} />
      </Card>
    </div>
  );

  const fullProfile = sittingMp
    ? { href: `/mps/${sittingMp.memberId}`, label: "Open the full MP profile" }
    : curatedPerson ? { href: `/people/${curatedPerson.slug}`, label: `Open ${curatedPerson.name}'s full profile` } : undefined;

  const tabs: ProfileTab[] = [
    { id: "story", label: "Story", content: story },
    ...(won ? [{
      id: "work", label: "Work", content: (
        <Card title="Work as MP">
          {fullProfile ? (
            <p>Positions, committees and parliamentary records are on the full profile.{" "}
              <Link href={fullProfile.href} className="font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">{fullProfile.label}</Link>
            </p>
          ) : <p>Attendance, questions, debates and local area fund spending for this MP are not collected yet. They come from Parliament&apos;s own records.</p>}
        </Card>
      ),
    }] : []),
    {
      id: "elections", label: "Elections", content: (
        <Card title={`${seat.name}, 2024`}>
          <p>{formatNumber(candidate.votes)} votes, including {formatNumber(candidate.postalVotes)} postal votes. {seat.candidates.length} candidates contested.</p>
          <SeatResultBars seat={seat} highlight={candidate} compareWith={won ? seat.candidates[1] : seat.candidates[0]} />
        </Card>
      ),
    },
    {
      id: "money", label: "Money and cases", content: (
        <Card title="Money and cases">
          <p>Every candidate files a sworn affidavit with assets, liabilities, education and pending criminal cases. These are not collected for this profile yet.</p>
          <p className="mt-3 text-sm text-[#66796d]">When added, cases will be shown as declared by the candidate. A declared case is not a conviction.</p>
        </Card>
      ),
    },
    { id: "sources", label: "Sources", content: <SourceNote data={data} rows={candidate.locator.toLowerCase()} reviewedAt={candidate.reviewedAt} /> },
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-[#286b4e]" aria-label="Breadcrumb">
        <Link href="/seats" className="hover:underline">All seats</Link>
        <span className="mx-2 text-[#a3b7a7]" aria-hidden="true">/</span>
        <Link href={seatHref(seat)} className="hover:underline">{seat.name}</Link>
      </nav>

      <ProfileHeader
        eyebrow={`${seat.name}, ${seat.state} · Lok Sabha 2024`}
        name={candidate.name}
        subtitle={`${party?.name ?? candidate.party}${candidate.partySymbol ? ` · ${candidate.partySymbol}` : ""}`}
        status={won ? { label: "Won", tone: "won" } : { label: `Lost · ${candidate.rank} of ${seat.candidates.length}`, tone: "lost" }}
        summary={summaryOf(seat, candidate, partyName)}
      >
        {namesake && (
          <p className="mt-3 rounded-2xl bg-[#fbf6e8] p-3 text-sm text-[#6b5520]">Another candidate in this seat has the same name. This profile is the {party?.name ?? candidate.party} candidate.</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Age" value={candidate.age === null ? "Not stated" : String(candidate.age)} source={eci} />
          <Tile label="Education" value="Not yet" pending={affidavitPending} />
          <Tile label="Declared assets" value="Not yet" pending={affidavitPending} />
          <Tile label="Declared cases" value="Not yet" pending={affidavitPending} />
        </div>
      </ProfileHeader>

      <div className="mt-4">
        <ProfileTabs tabs={tabs} />
      </div>
    </div>
  );
}
