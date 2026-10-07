import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMp, publicMpFact } from "@/lib/public-mps";
import { ProfileDisclosure, ProfileJumpLinks, ProfileSection } from "@/components/ProfileSection";

interface PageProps { params: Promise<{ memberId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { memberId } = await params;
  const profile = /^\d+$/.test(memberId) ? await getPublicMp(Number(memberId)) : undefined;
  return { title: profile ? `${profile.name} | Vote Better` : "MP profile | Vote Better" };
}

export default async function MpProfilePage({ params }: PageProps) {
  const { memberId } = await params;
  const profile = /^\d+$/.test(memberId) ? await getPublicMp(Number(memberId)) : undefined;
  if (!profile) notFound();
  const officialUrl = `https://sansad.in/ls/members/biography/${profile.memberId}`;
  const birth = publicMpFact(profile, "person.birthDate");
  const education = publicMpFact(profile, "person.educationStatement");
  const profession = publicMpFact(profile, "person.profession");
  const positions = publicMpFact(profile, "office.positionsHeld");
  const socials = profile.facts.filter((fact) => fact.predicate === "person.socialProfile" && typeof fact.value === "string");
  const summary = [["Profession", profession], ["Education", education], ["Born", birth]] as const;
  const hasBackground = summary.some(([, fact]) => fact && typeof fact.value === "string");
  const hasPositions = Boolean(positions && Array.isArray(positions.value) && positions.value.length);
  return <div className="mx-auto w-full max-w-[1160px] px-4 pb-16 pt-7 sm:px-6 sm:pt-10 lg:px-8">
    <Link href="/mps" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#276b4e] hover:underline">← All MP profiles</Link>
    <header className="mt-5 overflow-hidden rounded-[28px] border border-[#d6e2d7] bg-white shadow-[0_12px_36px_rgba(24,55,43,.05)]">
      <div className="grid gap-7 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_280px] md:gap-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-12 lg:p-10">
        <div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.1em] text-[#326c4d]"><span>Digital Sansad record</span><span>Source checked {profile.sourceCheckedAt.slice(0, 10)}</span></p>
          <h1 className="mt-4 max-w-[16ch] text-[clamp(2.5rem,5vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-[#19372d]">{profile.name}</h1>
          <p className="mt-4 text-base leading-7 text-[#4d6354]">Lok Sabha member for {profile.constituency}, {profile.state}</p>
          <p className="mt-5 inline-flex rounded-full bg-[#e7f3e9] px-3 py-2 text-xs font-bold text-[#1d6042]">Listed as {profile.membershipStatus.toLowerCase()} on {profile.rosterSource.capturedAt.slice(0, 10)}</p>
        </div>
        <div className="self-start rounded-2xl bg-[#eff6ef] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#3c7554]">Office listed</p>
          <p className="mt-3 text-xl font-semibold leading-7 tracking-[-0.03em] text-[#19372d]">Member of Parliament</p>
          <p className="mt-2 text-sm leading-6 text-[#4d6354]">{profile.constituency}, {profile.state}</p>
          <p className="mt-5 border-t border-[#cfdfd1] pt-4 text-xs font-bold uppercase tracking-[0.1em] text-[#55715e]">Party in roster</p>
          <p className="mt-1 font-semibold text-[#19372d]">{profile.party}</p>
          <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#24694b] underline underline-offset-4">View on Digital Sansad ↗</a>
        </div>
      </div>
    </header>
    <div className="mt-8"><ProfileJumpLinks links={[
      ...(hasPositions ? [{ href: "#positions", label: "Positions" }] : []),
      ...(hasBackground ? [{ href: "#background", label: "Background" }] : []),
      ...(socials.length ? [{ href: "#presence", label: "Public presence" }] : []),
      { href: "#sources", label: "Sources" },
    ]} /></div>
    {positions && Array.isArray(positions.value) && positions.value.length > 0 && <ProfileSection id="positions" number="01" title="Positions listed by Sansad">
      <p className="mt-2 text-sm text-[#607568]">Source captured {positions.source.capturedAt.slice(0, 10)}. A missing date means Sansad did not provide one for that entry.</p>
      <ol className="mt-5 space-y-3">{positions.value.slice(0, 4).map((position, index) => <li key={`${position.title}-${index}`} className="border-l-2 border-[#a7cdb0] py-1 pl-4">
        <p className="font-semibold text-[#1f4532]">{position.title}</p>
        <p className="mt-1 text-sm text-[#607568]">{position.period ?? "Date not stated"}</p>
      </li>)}</ol>
      {positions.value.length > 4 && <details className="mt-5 rounded-xl bg-[#f5faf5] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#216146]">Show {positions.value.length - 4} more positions</summary>
        <ol className="mt-4 space-y-3">{positions.value.slice(4).map((position, index) => <li key={`${position.title}-${index}`} className="border-l-2 border-[#a7cdb0] py-1 pl-4">
          <p className="font-semibold text-[#1f4532]">{position.title}</p>
          <p className="mt-1 text-sm text-[#607568]">{position.period ?? "Date not stated"}</p>
        </li>)}</ol>
      </details>}
      <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-semibold text-[#24694b] underline">Check positions on Digital Sansad ↗</a>
    </ProfileSection>}
    {hasBackground && <ProfileSection id="background" number={hasPositions ? "02" : "01"} title="Background" description="These details are listed by Digital Sansad. A missing field is left blank.">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map(([label, fact]) => fact && typeof fact.value === "string" && <div key={label} className="rounded-xl bg-[#f5faf5] p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#688071]">{label}</dt>
          <dd className="mt-2 font-semibold text-[#1f4532]">{fact.value}</dd>
          <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center text-xs text-[#24694b] underline">Digital Sansad · captured {fact.source.capturedAt.slice(0, 10)}</a>
        </div>)}
      </dl>
    </ProfileSection>}
    {socials.length > 0 && <ProfileSection id="presence" number={String(1 + Number(hasPositions) + Number(hasBackground)).padStart(2, "0")} title="Links listed by Sansad">
      <div className="mt-4 flex flex-wrap gap-3">{socials.map((fact) => <a key={fact.source.locator} href={fact.value as string} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#bed6c4] px-4 py-2 text-sm font-semibold text-[#216146]">{new URL(fact.value as string).hostname} ↗</a>)}</div>
    </ProfileSection>}
    <section id="sources" className="mt-10 scroll-mt-28 border-t border-[#dce6dc] pt-8" aria-labelledby="sources-heading">
      <h2 id="sources-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">Sources and limits</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#53695a]">These fields were checked against saved Digital Sansad responses on {profile.sourceCheckedAt.slice(0, 10)}. This does not independently confirm every claim. Missing history stays blank.</p>
      <div className="mt-4"><ProfileDisclosure title="Technical source details">
      <p className="mt-3 break-all">Roster: {profile.rosterSource.url} · {profile.rosterSource.contentHash}</p>
      <ul className="mt-3 space-y-2">{profile.facts.map((fact) => <li key={`${fact.predicate}-${fact.source.locator}`} className="break-all">{fact.predicate}: {fact.source.locator} · {fact.source.contentHash}</li>)}</ul>
      </ProfileDisclosure></div>
    </section>
  </div>;
}
