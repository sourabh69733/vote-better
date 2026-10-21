import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listAreaOverviews } from "@/lib/civic-area";
import {
  candidateHref, formatNumber, formatShort, getCandidate, loadLokSabha2024, seatHref, summaryOf,
} from "@/lib/lok-sabha-2024";
import ProfileTabs, { type ProfileTab } from "../../../ProfileTabs";
import SourceChip, { type ChipSource } from "../../../SourceChip";
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

function initials(name: string) {
  const parts = name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

function Tile({ label, value, source, pending }: { label: string; value: string; source?: ChipSource; pending?: string }) {
  return (
    <div className={`rounded-2xl p-3 sm:p-4 ${pending ? "border border-dashed border-[#d5e0d5]" : "bg-[#f3f7f2]"}`}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7a8c7e]">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-[-0.02em] ${pending ? "text-[#a3b3a6]" : "text-[#19372d]"}`}>{value}</p>
      {pending ? <p className="mt-0.5 text-xs leading-4 text-[#8a9b8e]">{pending}</p> : source && <div className="mt-2"><SourceChip source={source} /></div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-7">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">{title}</h2>
      <div className="mt-3 text-[15px] leading-7 text-[#43594a]">{children}</div>
    </section>
  );
}

function StatusPill({ won, rank, total, className }: { won: boolean; rank: number; total: number; className: string }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${won ? "bg-[#1c6047] text-white" : "bg-[#f6efdc] text-[#7a5d1c]"} ${className}`}>
      {won ? "Won" : `Lost · ${rank} of ${total}`}
    </span>
  );
}

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
  const eci: ChipSource = {
    label: "ECI", title: "ECI 2024 results, report 33", url: data.source.url,
    locator: candidate.locator.toLowerCase(), checkedOn: day(candidate.reviewedAt),
  };
  const compareWith = won ? seat.candidates[1] : seat.candidates[0];
  const affidavitPending = "From the 2024 affidavit";

  const who: [string, string][] = [
    ["Party", party?.name ?? candidate.party],
    ...(party && party.type !== party.name ? [["Party type", party.type] as [string, string]] : []),
    ...(candidate.partySymbol ? [["Election symbol", candidate.partySymbol] as [string, string]] : []),
    ["Gender", candidate.gender ? genderLabel[candidate.gender] : "Not stated"],
    ["Category", candidate.category ? categoryLabel[candidate.category] ?? candidate.category : "Not stated"],
  ];

  const story = (
    <div className="grid gap-4">
      <Card title="Timeline">
        <ol className="border-l-2 border-[#dce6dc] pl-5">
          <li className="relative">
            <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ${won ? "bg-[#1c6047]" : "bg-[#9ec9a8]"}`} aria-hidden="true" />
            <p className="text-sm font-bold text-[#4c8063]">2024 · Lok Sabha</p>
            <p>{won ? "Won" : "Contested"} {seat.name}, {seat.state} for {party?.name ?? candidate.party}. {formatNumber(candidate.votes)} votes, {candidate.shareOfValidVotes.toFixed(2)}%.</p>
            <div className="mt-1"><SourceChip source={eci} /></div>
          </li>
          <li className="relative mt-5">
            <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-dashed border-[#c5d4c7] bg-white" aria-hidden="true" />
            <p className="text-sm text-[#8a9b8e]">Earlier elections, offices and career are not collected yet.</p>
          </li>
        </ol>
      </Card>
      <Card title="Who they are">
        <dl className="grid gap-2">
          {who.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-[#eef3ed] pb-2 text-sm last:border-0">
              <dt className="text-[#66796d]">{label}</dt>
              <dd className="text-right font-semibold text-[#19372d]">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3"><SourceChip source={eci} /></div>
      </Card>
    </div>
  );

  const election = (
    <Card title={`${seat.name}, 2024`}>
      <p>{formatNumber(candidate.votes)} votes, including {formatNumber(candidate.postalVotes)} postal votes. {seat.candidates.length} candidates contested.</p>
      <ol className="mt-4 grid gap-3">
        {seat.candidates.slice(0, Math.max(5, candidate.rank)).map((other) => {
          const self = other.slug === candidate.slug;
          return (
            <li key={other.slug}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                {self ? (
                  <span className="font-bold text-[#19372d]">{other.rank}. {other.name} <span className="font-normal text-[#5f7465]">({other.party})</span></span>
                ) : (
                  <Link href={candidateHref(seat, other)} className="text-[#2c4f3a] hover:underline">{other.rank}. {other.name} <span className="text-[#5f7465]">({other.party})</span></Link>
                )}
                <span className="shrink-0 tabular-nums text-[#5f7465]">{formatShort(other.votes)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-[#eef3ed]" aria-hidden="true">
                <div className={`h-full rounded-full ${self ? "bg-[#1c6047]" : "bg-[#c8dccc]"}`} style={{ width: `${Math.max(other.shareOfValidVotes, 0.5)}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
        <Link href={seatHref(seat)} className="text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Full {seat.name} result</Link>
        {compareWith && (
          <Link href={`${seatHref(seat)}/compare?a=${candidate.slug}&b=${compareWith.slug}`} className="text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Compare with {compareWith.name}</Link>
        )}
      </div>
    </Card>
  );

  const work = (
    <Card title="Work as MP">
      {curatedPerson ? (
        <p>
          Attendance, questions and debates are on the checked profile.{" "}
          <Link href={`/people/${curatedPerson.slug}`} className="font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Open {curatedPerson.name}&apos;s full profile</Link>
        </p>
      ) : (
        <p>Attendance, questions, debates and local area fund spending for this MP are not collected yet. They come from Parliament&apos;s own records.</p>
      )}
    </Card>
  );

  const money = (
    <Card title="Money and cases">
      <p>Every candidate files a sworn affidavit with assets, liabilities, education and pending criminal cases. These are not collected for this profile yet.</p>
      <p className="mt-3 text-sm text-[#66796d]">When added, cases will be shown as declared by the candidate. A declared case is not a conviction.</p>
    </Card>
  );

  const tabs: ProfileTab[] = [
    { id: "story", label: "Story", content: story },
    ...(won ? [{ id: "work", label: "Work", content: work }] : []),
    { id: "elections", label: "Elections", content: election },
    { id: "money", label: "Money and cases", content: money },
    { id: "sources", label: "Sources", content: <SourceNote data={data} rows={candidate.locator.toLowerCase()} reviewedAt={candidate.reviewedAt} /> },
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-[#286b4e]" aria-label="Breadcrumb">
        <Link href="/seats" className="hover:underline">All seats</Link>
        <span className="mx-2 text-[#a3b7a7]" aria-hidden="true">/</span>
        <Link href={seatHref(seat)} className="hover:underline">{seat.name}</Link>
      </nav>

      <header className="mt-6 rounded-[28px] border border-[#dce6dc] bg-white p-5 shadow-[0_12px_36px_rgba(28,64,40,.05)] sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e3f0e5] text-lg font-bold text-[#1c6047] sm:h-16 sm:w-16" aria-hidden="true">{initials(candidate.name)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#4c8063]">{seat.name}, {seat.state} · Lok Sabha 2024</p>
            <h1 className="mt-1 text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.05em] text-[#19372d]">{candidate.name}</h1>
            <p className="mt-1 text-[#4f6455]">{party?.name ?? candidate.party}{candidate.partySymbol ? ` · ${candidate.partySymbol}` : ""}</p>
          </div>
          <StatusPill won={won} rank={candidate.rank} total={seat.candidates.length} className="hidden sm:inline-flex" />
        </div>
        <StatusPill won={won} rank={candidate.rank} total={seat.candidates.length} className="mt-3 inline-flex sm:hidden" />

        <p className="mt-5 rounded-2xl bg-[#f3f7f2] p-4 text-[16px] leading-7 text-[#2c4436]">{summaryOf(seat, candidate, partyName)}</p>
        {namesake && (
          <p className="mt-3 rounded-2xl bg-[#fbf6e8] p-3 text-sm text-[#6b5520]">Another candidate in this seat has the same name. This profile is the {party?.name ?? candidate.party} candidate.</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Age" value={candidate.age === null ? "Not stated" : String(candidate.age)} source={eci} />
          <Tile label="Education" value="Not yet" pending={affidavitPending} />
          <Tile label="Declared assets" value="Not yet" pending={affidavitPending} />
          <Tile label="Declared cases" value="Not yet" pending={affidavitPending} />
        </div>
      </header>

      <div className="mt-4">
        <ProfileTabs tabs={tabs} />
      </div>
    </div>
  );
}
