import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadResearchRoster } from "@/lib/research-roster";
import { loadReviewedProfilePreview } from "@/lib/reviewed-profile-preview";
import { isReviewedDraftFact, loadDraftProfilePreview,
  type DraftFact } from "@/lib/draft-profile-preview";

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
  const officialProfileUrl = `https://sansad.in/ls/members/biographyM/${member.id}`;
  const reviewed = await loadReviewedProfilePreview(member.id);
  const draft = await loadDraftProfilePreview(member.id);
  const facts = draft?.facts ?? reviewed?.facts ?? [];
  const factReviewed = (fact: DraftFact) => draft
    ? isReviewedDraftFact(fact, reviewed?.facts ?? []) : true;
  const profession = facts.find((item) => item.predicate === "person.profession");
  const education = facts.find((item) => item.predicate === "person.educationStatement");
  const birthDate = facts.find((item) => item.predicate === "person.birthDate");
  const photo = facts.find((item) => item.predicate === "person.photoUrl");
  const social = facts.filter((item) => item.predicate === "person.socialProfile" && typeof item.value === "string");
  const positions = facts.find((item) => item.predicate === "office.positionsHeld");
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
      {facts.length > 0 && <section className="mt-8 rounded-2xl border border-[#dce6dc] bg-[#f5faf5] p-5 sm:p-6" aria-labelledby="profile-details-heading">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#91692d]">Local profile draft</p>
        <h2 id="profile-details-heading" className="mt-2 text-xl font-semibold text-[#19372d]">About this person</h2>
        <p className="mt-2 text-sm leading-6 text-[#607568]">All currently collected biography fields appear here. Each field shows whether Vote Better has reviewed it. Missing history stays missing.</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {summaryFacts.map(({ label, fact, value }) => <div key={fact.predicate} className="rounded-xl bg-white p-4">
            <dt className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.1em] text-[#688071]">{label}
              <span className={factReviewed(fact) ? "text-emerald-800" : "text-amber-700"}>{factReviewed(fact) ? "Reviewed" : "Unverified"}</span>
            </dt>
            <dd className="mt-2 text-sm font-semibold text-[#1f4532]">{value}</dd>
            <a href={officialProfileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#24694b] underline underline-offset-4">Check on Digital Sansad ↗</a>
            <p className="mt-1 text-xs text-[#688071]">Captured {fact.source.capturedAt.slice(0, 10)}</p>
          </div>)}
        </dl>
        {(photo || social.length > 0) && <div className="mt-5 rounded-xl bg-white p-4">
          <h3 className="text-sm font-semibold text-[#1f4532]">Public presence</h3>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {photo && typeof photo.value === "string" && <a href={photo.value} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#24694b] underline underline-offset-4">Official photo · {factReviewed(photo) ? "reviewed" : "unverified"} ↗</a>}
            {social.map((link) => <a key={link.source.locator} href={link.value as string} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#24694b] underline underline-offset-4">{new URL(link.value as string).hostname} · {factReviewed(link) ? "reviewed" : "unverified"} ↗</a>)}
          </div>
        </div>}
        {positions && Array.isArray(positions.value) && positions.value.length > 0 && <details className="mt-5 rounded-xl bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#1f4532]">Positions held ({positions.value.length}) · {factReviewed(positions) ? "reviewed" : "unverified"}</summary>
          <ol className="mt-4 space-y-4">{positions.value.map((position, index) => <li key={`${position.title}-${index}`} className="border-t border-[#e2eae2] pt-3 text-sm">
            <p className="font-semibold text-[#1f4532]">{position.title}</p>
            <p className="mt-1 text-[#607568]">{position.period ?? "Date not stated in source"}</p>
          </li>)}</ol>
          <a href={officialProfileUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs font-semibold text-[#24694b] underline underline-offset-4">Check positions on Digital Sansad ↗</a>
          <p className="mt-1 text-xs text-[#688071]">Captured {positions.source.capturedAt.slice(0, 10)}</p>
        </details>}
        <p className="mt-5 text-xs leading-5 text-[#607568]">Party changes, earlier employment, and education dates appear only if a source supplies them. This draft is not a complete life history.</p>
      </section>}
      <div className="mt-8 border-t border-[#e2eae2] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#688071]">Source trail</p>
        <a href="https://sansad.in/ls/members" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-[#24694b] underline underline-offset-4">Digital Sansad member list ↗</a>
        <p className="mt-2 text-xs text-[#688071]">Captured {source.capturedAt} · Snapshot {source.id}</p>
        <details className="mt-4 text-xs text-[#607568]">
          <summary className="cursor-pointer font-semibold">Technical evidence</summary>
          <p className="mt-2">Exact source endpoints and snapshot records used by this local draft:</p>
          <ul className="mt-2 space-y-2 break-all">
            <li><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Member list API</a> · {source.id}</li>
            {facts.map((fact) => <li key={`${fact.predicate}-${fact.source.locator}`}>
              <a href={fact.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{fact.predicate}</a> · {fact.source.locator} · {fact.source.contentHash}
            </li>)}
          </ul>
        </details>
      </div>
    </article>
  </div>;
}
