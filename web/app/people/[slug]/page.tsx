import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAreaForPerson } from "@/lib/civic-area";
import { getPersonProfile, getProfileSource, listPersonSlugs, type SourceRecord } from "@/lib/verified-profile";
import { getJaipurVoteTraceId } from "@/lib/publication";
import { ProfileJumpLinks, ProfileSection } from "@/components/ProfileSection";
import { ParliamentQuestions } from "@/components/ParliamentQuestions";
import { getParliamentaryWork } from "@/lib/parliamentary-work";
import { formatTermDuration } from "@/lib/term-duration";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listPersonSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = getPersonProfile(slug);
  return { title: profile ? `${profile.name} | Vote Better` : "Profile not found" };
}

function EvidenceLink({ source }: { source: SourceRecord }) {
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
      {source.title} ↗
    </a>
  );
}

export default async function PersonPage({ params }: PageProps) {
  const { slug } = await params;
  const profile = getPersonProfile(slug);
  if (!profile) notFound();

  const area = getAreaForPerson(slug);
  const office = profile.officeTerms.find((term) => !term.endedOn);
  const election = profile.candidacies[0];
  const electionStatus = election ? election.status[0].toUpperCase() + election.status.slice(1) : "";
  const electionYear = election?.resultDate?.slice(0, 4);
  const voteTraceId = getJaipurVoteTraceId(profile.slug);
  const showTimeline = profile.timeline.length > 1 || profile.timeline.some((event) => event.kind !== "election");
  const parliamentaryWork = getParliamentaryWork(slug);
  const showWork = Boolean(parliamentaryWork || profile.activities.length);

  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 pb-16 pt-7 sm:px-6 sm:pt-10 lg:px-8">
      <Link href={area ? `/areas/${area.id}` : "/"} className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 hover:underline">
        ← {area ? area.label : "Verified areas"}
      </Link>

      <header className="mt-5 overflow-hidden rounded-[28px] border border-[#d6e2d7] bg-white shadow-[0_12px_36px_rgba(24,55,43,.05)]">
        <div className="grid gap-7 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_280px] md:gap-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-12 lg:p-10">
          <div>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.1em] text-[#326c4d]"><span>Person profile</span><span>Core facts reviewed {profile.reviewedOn}</span></p>
            <h1 className="mt-4 max-w-[16ch] text-[clamp(2.5rem,5vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-[#19372d]">{profile.name}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#4d6354]">{office ? `${office.title} for ${office.constituency}, ${office.state}` : election ? `${election.election} · ${electionStatus}` : "Sourced public profile"}</p>
            <p className="mt-5 inline-flex rounded-full bg-[#e7f3e9] px-3 py-2 text-xs font-bold text-[#1d6042]">{office ? "Current representative" : election?.status === "contesting" ? "Contesting" : "Election record"}</p>
          </div>
          {(office || election) && <div className="self-start rounded-2xl bg-[#eff6ef] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#3c7554]">{office ? "Office held" : "Election record"}</p>
            <p className="mt-3 text-xl font-semibold leading-7 tracking-[-0.03em] text-[#19372d]">{office?.title ?? election?.election}</p>
            {office && <p className="mt-2 text-sm leading-6 text-[#4d6354]">{office.constituency}, {office.state} · from {office.startedOn}</p>}
            {office && <p className="mt-1 text-sm font-semibold text-[#285b3e]">{formatTermDuration(office.startedOn, office.reviewedOn)} in this MP term · as of {office.reviewedOn}</p>}
            {!office && election && <p className="mt-2 text-sm leading-6 text-[#4d6354]">{electionStatus}{election.resultDate ? ` · result ${election.resultDate}` : ""}{election.votes !== undefined ? ` · ${election.votes.toLocaleString("en-IN")} votes` : ""}</p>}
            <p className="mt-5 border-t border-[#cfdfd1] pt-4 text-xs font-bold uppercase tracking-[0.1em] text-[#55715e]">{office ? `Current party · checked ${office.reviewedOn}` : `Party at ${electionYear ?? "recorded"} election`}</p>
            <p className="mt-1 font-semibold text-[#19372d]">{office?.party ?? election?.party}</p>
            <div className="mt-2">{office ? <EvidenceLink source={getProfileSource(profile, office.statusSourceId)} /> : election && <EvidenceLink source={getProfileSource(profile, election.sourceId)} />}</div>
          </div>}
        </div>
        {profile.background && (profile.background.educationDetail || profile.background.workDescription) && <div className="grid gap-4 border-t border-[#e2ebe2] bg-[#fafcf9] px-6 py-5 sm:grid-cols-2 sm:px-8 lg:px-10">
          {profile.background.educationDetail && <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#587061]">Education · {profile.background.context}</p><p className="mt-1 font-medium leading-6 text-[#1c3b2d]">{profile.background.educationDetail}</p></div>}
          {profile.background.workDescription && <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#587061]">Work · {profile.background.context}</p><p className="mt-1 font-medium leading-6 text-[#1c3b2d]">{profile.background.workDescription}</p></div>}
          <div className="sm:col-span-2"><EvidenceLink source={getProfileSource(profile, profile.background.sourceId)} /></div>
        </div>}
      </header>

      <div className="mt-8"><ProfileJumpLinks links={[
        ...(profile.officeTerms.length ? [{ href: "#offices", label: "Offices held" }] : []),
        ...(showTimeline ? [{ href: "#life", label: "Life and public work" }] : []),
        ...(showWork ? [{ href: "#work", label: "Work in office" }] : []),
        ...((election || profile.disclosures.length) ? [{ href: "#records", label: "Election and filings" }] : []),
        { href: "#sources", label: "Sources" },
      ]} /></div>

      <div className="mt-9 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
        <div>
          {profile.officeTerms.length > 0 && <ProfileSection id="offices" number="01" title="Offices held" description="Office status is tied to the date it was checked, not a live government feed.">
            <div className="grid gap-3">{profile.officeTerms.map((term) => <article key={`${term.title}-${term.startedOn}`} className={`rounded-2xl border px-5 py-4 ${term.endedOn ? "border-[#dce6dc] bg-white" : "border-[#b9d7bf] bg-[#f1f8f1]"}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{term.endedOn ? "Past office" : "Current office"} · {term.startedOn} to {term.endedOn ?? "present"}</p>
              <h3 className="mt-1 text-base font-bold text-slate-900">{term.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{term.constituency}, {term.state} · {term.party}</p>
              <div className="mt-2"><EvidenceLink source={getProfileSource(profile, term.statusSourceId)} /></div>
            </article>)}</div>
          </ProfileSection>}

          {showTimeline && <ProfileSection id="life" number={profile.officeTerms.length ? "02" : "01"} title="Life and public work" description="Selected dated records, not a continuous employment history. Gaps mean we have not found a dated source, not that nothing happened.">
            <ol className="border-l-2 border-emerald-200 pl-5">{profile.timeline.toReversed().map((event) => <li key={`${event.kind}-${event.date}-${event.title}`} className="relative border-b border-slate-200 py-4 last:border-b-0 before:absolute before:-left-[27px] before:top-[23px] before:h-3 before:w-3 before:rounded-full before:bg-emerald-600">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{event.date} · {{ career: "Public role", education: "Education", party: "Party role", work: "Work declaration", election: "Election" }[event.kind]}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{event.title}</h3>
              {event.party && <p className="mt-1 text-sm text-slate-600">{event.kind === "election" ? "Party at election" : "Party in this record"}: {event.party}</p>}
              <div className="mt-2"><EvidenceLink source={getProfileSource(profile, event.sourceId)} /></div>
            </li>)}</ol>
          </ProfileSection>}

          {showWork && <ProfileSection id="work" number={String(1 + Number(profile.officeTerms.length > 0) + Number(showTimeline)).padStart(2, "0")} title="Work in office" description="Documented parliamentary actions. A question is not proof that a project was completed.">
            <div className="grid gap-5">
              {parliamentaryWork && <ParliamentQuestions work={parliamentaryWork} />}
              {profile.activities.length > 0 && <div>
                {parliamentaryWork && <h3 className="mb-3 text-base font-bold text-[#19372d]">Earlier sourced example</h3>}
              {profile.activities.map((activity) => <article key={activity.sourceId} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{activity.date}</p>
                <h3 className="mt-2 font-bold text-slate-900">{activity.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
                <div className="mt-3"><EvidenceLink source={getProfileSource(profile, activity.sourceId)} /></div>
              </article>)}
              </div>}
            </div>
          </ProfileSection>}

          {(election || profile.disclosures.length > 0) && <details id="records" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <summary className="cursor-pointer text-xl font-bold text-slate-900">Election and filing records</summary>
            <p className="mt-3 text-sm text-slate-600">Election results and information declared at filing time. Open a source to check each claim.</p>

          {election && <section className="mt-8" aria-labelledby="election-heading">
            <h2 id="election-heading" className="text-xl font-bold text-slate-900">Election record</h2>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6">
              <p className="font-semibold text-slate-900">{election.election}</p>
              {election.party && <p className="mt-1 text-sm text-slate-600">{election.party}</p>}
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {electionStatus}.
                {election.resultDate ? ` Result dated ${election.resultDate}.` : ""}
                {election.votes !== undefined && ` The return records ${election.votes.toLocaleString("en-IN")} votes.`}
              </p>
              <div className="mt-3"><EvidenceLink source={getProfileSource(profile, election.sourceId)} /></div>
              {voteTraceId && <Link href={`/facts/${voteTraceId}`} className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline underline-offset-4">See how the vote total was checked</Link>}
            </div>
          </section>}

          {profile.disclosures.map((disclosure) => <section key={disclosure.sourceId} className="mt-8" aria-labelledby={`disclosure-${disclosure.sourceId}`}>
            <h2 id={`disclosure-${disclosure.sourceId}`} className="text-xl font-bold text-slate-900">Affidavit summary</h2>
            <p className="mt-2 text-sm text-slate-600">2024 self-declared affidavit or ECI filing. These are filing-time disclosures, not current values. Each item is shown only where the linked record supports it.</p>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6">
              <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                {disclosure.ageAtFiling !== undefined && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Age at filing</dt><dd className="mt-1 font-semibold text-slate-900">{disclosure.ageAtFiling}</dd></div>}
                {disclosure.education && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Education declared</dt><dd className="mt-1 font-semibold text-slate-900">{disclosure.education}</dd></div>}
                {disclosure.declaredCases !== undefined && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Criminal cases declared</dt><dd className="mt-1 font-semibold text-slate-900">{disclosure.declaredCases}</dd></div>}
                {disclosure.declaredAssetsRupees !== undefined && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assets declared</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">₹{disclosure.declaredAssetsRupees.toLocaleString("en-IN")}</dd></div>}
                {disclosure.declaredLiabilitiesRupees !== undefined && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Liabilities declared</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">₹{disclosure.declaredLiabilitiesRupees.toLocaleString("en-IN")}</dd></div>}
              </dl>
              <div className="mt-5 border-t border-slate-100 pt-4"><EvidenceLink source={getProfileSource(profile, disclosure.sourceId)} /></div>
            </div>
          </section>)}
          </details>}
        </div>

        <aside id="sources" className="grid scroll-mt-28 gap-4 lg:sticky lg:top-24" aria-label="Profile sources">
          {profile.publicProfiles.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="presence-heading">
            <h2 id="presence-heading" className="text-base font-bold text-slate-900">Official presence</h2>
            <div className="mt-3 grid gap-3">{profile.publicProfiles.map((link) => <div key={link.sourceId}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{link.label}</p>
              <EvidenceLink source={getProfileSource(profile, link.sourceId)} />
            </div>)}</div>
          </section>}
          <details className="rounded-2xl border border-slate-200 bg-white p-6">
            <summary className="cursor-pointer text-lg font-bold text-slate-900">Sources and review dates</summary>
            <p className="mt-3 text-sm text-slate-600">This is a selected record, not a complete account of this person or a judgment about performance.</p>
            <ul className="mt-4 grid gap-4">
              {profile.sources.map((source) => <li key={source.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <EvidenceLink source={source} />
                <p className="mt-1 text-xs text-slate-500">Checked {source.checkedOn}</p>
              </li>)}
            </ul>
          </details>
        </aside>
      </div>
    </div>
  );
}
