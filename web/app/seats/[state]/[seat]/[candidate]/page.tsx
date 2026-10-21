import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listAreaOverviews } from "@/lib/civic-area";
import { candidateHref, formatNumber, getCandidate, loadLokSabha2024, marginOf, seatHref } from "@/lib/lok-sabha-2024";
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

function ordinal(n: number) {
  const suffix = ["th", "st", "nd", "rd"];
  const lastTwo = n % 100;
  return n + (suffix[(lastTwo - 20) % 10] ?? suffix[lastTwo] ?? suffix[0]);
}
const genderLabel = { female: "Female", male: "Male", third: "Third gender" } as const;
const categoryLabel: Record<string, string> = { GENERAL: "General", SC: "Scheduled Caste", ST: "Scheduled Tribe" };

export default async function CandidatePage({ params }: PageProps) {
  const { state, seat: seatSlug, candidate: slug } = await params;
  const found = getCandidate(state, seatSlug, slug);
  if (!found) notFound();
  const { seat, candidate } = found;
  const data = loadLokSabha2024();
  const party = data.parties[candidate.party];
  const margin = marginOf(seat, candidate);
  const won = candidate.rank === 1;
  const namesake = seat.candidates.some((other) => other.slug !== candidate.slug && other.name === candidate.name);
  const curatedPerson = won
    ? listAreaOverviews().flatMap(({ links }) => links).find((link) => link.person.name.toLowerCase() === candidate.name.toLowerCase())?.person
    : undefined;

  const facts: [string, string][] = [
    ["Party", party?.name ?? candidate.party],
    ...(party && party.type !== party.name ? [["Party type", party.type] as [string, string]] : []),
    ...(candidate.party === "IND" && candidate.partySymbol ? [["Election symbol", candidate.partySymbol] as [string, string]] : []),
    ["Age at the 2024 election", candidate.age === null ? "Not stated" : String(candidate.age)],
    ["Gender", candidate.gender ? genderLabel[candidate.gender] : "Not stated"],
    ["Category", candidate.category ? categoryLabel[candidate.category] ?? candidate.category : "Not stated"],
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-[#286b4e]" aria-label="Breadcrumb">
        <Link href="/seats" className="hover:underline">All seats</Link>
        <span className="mx-2 text-[#a3b7a7]" aria-hidden="true">/</span>
        <Link href={seatHref(seat)} className="hover:underline">{seat.name}</Link>
      </nav>

      <header className="mt-6 rounded-[28px] border border-[#dce6dc] bg-white p-6 shadow-[0_12px_36px_rgba(28,64,40,.05)] sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2a7658]">Candidate · Lok Sabha 2024 · {seat.name}, {seat.state}</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-[#19372d]">{candidate.name}</h1>
        <p className="mt-2 text-lg text-[#4f6455]">{party?.name ?? candidate.party}</p>
        <p className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-bold ${won ? "bg-[#1c6047] text-white" : "bg-[#eef3ed] text-[#44604d]"}`}>
          {won ? "Won the seat" : `Finished ${ordinal(candidate.rank)} of ${seat.candidates.length}`}
        </p>
        {namesake && (
          <p className="mt-4 rounded-2xl bg-[#fbf6e8] p-3 text-sm text-[#6b5520]">Another candidate in this seat has the same name. This profile is the {party?.name ?? candidate.party} candidate.</p>
        )}
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Result and background">
        <div className="rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-7">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">How they did</h2>
          <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#19372d] tabular-nums">{formatNumber(candidate.votes)}</p>
          <p className="text-sm text-[#5f7465]">votes · {candidate.shareOfValidVotes.toFixed(2)}% of valid votes</p>
          <div className="mt-4 h-2 rounded-full bg-[#eef3ed]" aria-hidden="true">
            <div className={`h-full rounded-full ${won ? "bg-[#1c6047]" : "bg-[#9ec9a8]"}`} style={{ width: `${Math.max(candidate.shareOfValidVotes, 0.4)}%` }} />
          </div>
          {margin && (
            <p className="mt-4 text-[15px] leading-7 text-[#43594a]">
              {margin.kind === "won" ? "Won by " : ""}<strong className="text-[#19372d]">{formatNumber(margin.votes)} votes</strong>
              {margin.kind === "won" ? " over " : " behind the winner, "}
              <Link href={candidateHref(seat, margin.other)} className="font-semibold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">{margin.other.name}</Link> ({margin.other.party}).
            </p>
          )}
          <p className="mt-2 text-sm text-[#66796d]">Includes {formatNumber(candidate.postalVotes)} postal votes.</p>
        </div>

        <div className="rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-7">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">Who they are</h2>
          <dl className="mt-4 grid gap-3">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-[#eef3ed] pb-2 text-sm last:border-0">
                <dt className="text-[#66796d]">{label}</dt>
                <dd className="text-right font-semibold text-[#19372d]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {curatedPerson && (
        <Link href={`/people/${curatedPerson.slug}`} className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-[#cfe0d2] bg-[#eff7ef] p-5 text-sm font-semibold text-[#1d6547] hover:bg-[#e3f0e5]">
          <span>See {curatedPerson.name}&apos;s checked profile: office, education, career and parliamentary work.</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <section className="mt-6 rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-7" aria-labelledby="rivals-heading">
        <h2 id="rivals-heading" className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">Others in {seat.name}</h2>
        <ol className="mt-3 divide-y divide-[#eef3ed]">
          {seat.candidates.filter((other) => other.slug !== candidate.slug).slice(0, 5).map((other) => (
            <li key={other.slug}>
              <Link href={candidateHref(seat, other)} className="flex items-center justify-between gap-4 py-3 text-sm hover:underline">
                <span><span className="text-[#8a9b8e]">{other.rank}.</span> <span className="font-semibold text-[#19372d]">{other.name}</span> <span className="text-[#5f7465]">({other.party})</span></span>
                <span className="shrink-0 tabular-nums text-[#5f7465]">{formatNumber(other.votes)}</span>
              </Link>
            </li>
          ))}
        </ol>
        <Link href={seatHref(seat)} className="mt-3 inline-block text-sm font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">See the full {seat.name} result</Link>
      </section>

      <section className="mt-6 rounded-[24px] border border-dashed border-[#cfdccf] bg-[#fbfcfa] p-6 text-sm leading-6 text-[#5f7465] sm:p-7" aria-labelledby="missing-heading">
        <h2 id="missing-heading" className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">Not on this profile yet</h2>
        <p className="mt-2">Assets, liabilities, declared criminal cases and education from the candidate&apos;s affidavit, earlier elections, and{won ? " parliamentary work" : " other public roles"}. We add each one only after checking it against the original record.</p>
      </section>

      <div className="mt-6">
        <SourceNote data={data} rows={candidate.locator.replace("Worksheet, row", "worksheet row")} reviewedAt={candidate.reviewedAt} />
      </div>
    </div>
  );
}
