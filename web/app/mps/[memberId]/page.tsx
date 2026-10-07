import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMp, publicMpFact } from "@/lib/public-mps";

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
  return <div className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
    <Link href="/mps" className="text-sm font-semibold text-[#276b4e] hover:underline">← All MP profiles</Link>
    <header className="mt-7 rounded-[28px] border border-[#dce6dc] bg-white p-6 shadow-[0_16px_44px_rgba(28,64,40,.05)] sm:p-9">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#347353]">{profile.constituency}, {profile.state} · Lok Sabha</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#19372d] sm:text-5xl">{profile.name}</h1>
      <p className="mt-3 text-lg text-[#425d4c]">{profile.party}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-[#e9f5eb] px-4 py-2 font-semibold text-[#216146]">Listed as {profile.membershipStatus.toLowerCase()} on {profile.rosterSource.capturedAt.slice(0, 10)}</span>
        <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#24694b] underline underline-offset-4">View on Digital Sansad ↗</a>
      </div>
    </header>
    <section className="mt-7 rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-8" aria-labelledby="background-heading">
      <h2 id="background-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">At a glance</h2>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        {summary.map(([label, fact]) => fact && typeof fact.value === "string" && <div key={label} className="rounded-xl bg-[#f5faf5] p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#688071]">{label}</dt>
          <dd className="mt-2 font-semibold text-[#1f4532]">{fact.value}</dd>
          <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-[#24694b] underline">Digital Sansad · captured {fact.source.capturedAt.slice(0, 10)}</a>
        </div>)}
      </dl>
    </section>
    {positions && Array.isArray(positions.value) && <section className="mt-7 rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-8" aria-labelledby="positions-heading">
      <h2 id="positions-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">Positions listed by Sansad</h2>
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
    </section>}
    {socials.length > 0 && <section className="mt-7 rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-8" aria-labelledby="social-heading">
      <h2 id="social-heading" className="text-xl font-semibold text-[#19372d]">Links listed by Sansad</h2>
      <div className="mt-4 flex flex-wrap gap-3">{socials.map((fact) => <a key={fact.source.locator} href={fact.value as string} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#bed6c4] px-4 py-2 text-sm font-semibold text-[#216146]">{new URL(fact.value as string).hostname} ↗</a>)}</div>
    </section>}
    <p className="mt-7 text-sm leading-6 text-[#607568]">These facts were checked against saved Digital Sansad responses on {profile.sourceCheckedAt.slice(0, 10)}. This does not independently confirm every claim. The profile includes only fields currently collected; missing history is left blank.</p>
    <details className="mt-4 rounded-xl border border-[#dce6dc] bg-white p-4 text-xs text-[#607568]">
      <summary className="cursor-pointer font-semibold text-[#216146]">Technical source details</summary>
      <p className="mt-3 break-all">Roster: {profile.rosterSource.url} · {profile.rosterSource.contentHash}</p>
      <ul className="mt-3 space-y-2">{profile.facts.map((fact) => <li key={`${fact.predicate}-${fact.source.locator}`} className="break-all">{fact.predicate}: {fact.source.locator} · {fact.source.contentHash}</li>)}</ul>
    </details>
  </div>;
}
