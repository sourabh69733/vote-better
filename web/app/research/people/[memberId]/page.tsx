import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadResearchRoster } from "@/lib/research-roster";
import { loadReviewedProfilePreview } from "@/lib/reviewed-profile-preview";

export const metadata: Metadata = {
  title: "Draft MP record | Vote Better",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ memberId: string }>;
}

export default async function ResearchMemberPage({ params }: PageProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { memberId } = await params;
  if (!/^\d+$/.test(memberId)) notFound();
  const roster = await loadResearchRoster();
  const member = roster?.members.find((item) => item.id === Number(memberId));
  const source = roster?.snapshots.find((item) => item.id === member?.snapshotId);
  if (!member || !source) notFound();
  const reviewed = await loadReviewedProfilePreview(member.id);
  const profession = reviewed?.facts.find((item) => item.predicate === "person.profession");
  const education = reviewed?.facts.find((item) => item.predicate === "person.educationStatement");
  const birthDate = reviewed?.facts.find((item) => item.predicate === "person.birthDate");
  const positions = reviewed?.facts.find((item) => item.predicate === "office.positionsHeld");
  const summaryFacts = [
    { label: "Profession listed", fact: profession },
    { label: "Education listed", fact: education },
    { label: "Birth date listed", fact: birthDate },
  ].flatMap(({ label, fact }) => fact && typeof fact.value === "string" ? [{ label, fact, value: fact.value }] : []);

  return <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
    <Link href="/research/pin" className="text-sm font-semibold text-[#276b4e] hover:underline">← PIN research</Link>
    <article className="mt-8 rounded-[28px] border border-[#dce6dc] bg-white p-6 shadow-[0_16px_44px_rgba(28,64,40,.06)] sm:p-10">
      <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#91692d]">Unreviewed Sansad record</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#19372d] sm:text-5xl">{member.name}</h1>
      <p className="mt-4 text-sm leading-6 text-[#607568]">Digital Sansad listed this person as a sitting Lok Sabha member when this source was captured on {source.capturedAt.slice(0, 10)}. The record has not completed Vote Better review.</p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {[["Constituency", member.constituency], ["State or territory", member.state], ["Party in source", member.party], ["Parliament member ID", String(member.id)]].map(([label, value]) =>
          <div key={label} className="rounded-2xl bg-[#f7faf5] px-5 py-4">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#688071]">{label}</dt>
            <dd className="mt-2 font-semibold text-[#1f4532]">{value}</dd>
          </div>)}
      </dl>
      {reviewed && reviewed.facts.length > 0 && <section className="mt-8 rounded-2xl border border-emerald-200 bg-[#f5faf5] p-5 sm:p-6" aria-labelledby="reviewed-profile-heading">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-800">Local review preview</p>
        <h2 id="reviewed-profile-heading" className="mt-2 text-xl font-semibold text-[#19372d]">More about this person</h2>
        <p className="mt-2 text-sm leading-6 text-[#607568]">Only individually reviewed facts appear here. This preview is not a complete life history.</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {summaryFacts.map(({ label, fact, value }) => <div key={fact.predicate} className="rounded-xl bg-white p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#688071]">{label}</dt>
            <dd className="mt-2 text-sm font-semibold text-[#1f4532]">{value}</dd>
            <a href={fact.source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#24694b] underline underline-offset-4">Source · checked {fact.source.capturedAt.slice(0, 10)} ↗</a>
          </div>)}
        </dl>
        {positions && Array.isArray(positions.value) && positions.value.length > 0 && <details className="mt-5 rounded-xl bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#1f4532]">Positions held ({positions.value.length})</summary>
          <ol className="mt-4 space-y-4">{positions.value.map((position, index) => <li key={`${position.title}-${index}`} className="border-t border-[#e2eae2] pt-3 text-sm">
            <p className="font-semibold text-[#1f4532]">{position.title}</p>
            <p className="mt-1 text-[#607568]">{position.period}</p>
          </li>)}</ol>
          <a href={positions.source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs font-semibold text-[#24694b] underline underline-offset-4">Source · checked {positions.source.capturedAt.slice(0, 10)} ↗</a>
        </details>}
      </section>}
      <div className="mt-8 border-t border-[#e2eae2] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#688071]">Source trail</p>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-[#24694b] underline underline-offset-4">Digital Sansad member list page ↗</a>
        <p className="mt-2 text-xs text-[#688071]">Captured {source.capturedAt} · Snapshot {source.id}</p>
      </div>
    </article>
  </div>;
}
