import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAreaForPerson } from "@/lib/civic-area";
import { getPersonProfile, getProfileSource, listPersonSlugs, type SourceRecord } from "@/lib/verified-profile";
import { getJaipurVoteTraceId } from "@/lib/publication";

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
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950">
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

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link href={area ? `/areas/${area.id}` : "/"} className="text-sm font-semibold text-emerald-800 hover:underline">
        ← {area ? area.label : "Verified areas"}
      </Link>

      <header className="mt-5 rounded-[26px] border border-emerald-950/10 bg-white p-5 shadow-sm sm:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Person profile · reviewed {profile.reviewedOn}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{profile.name}</h1>
          <p className="mt-2 text-base text-slate-700">{office ? `${office.title} · ${office.constituency}, ${office.state}` : election ? `${election.election} · ${electionStatus}` : "Sourced public profile"}</p>
        </div>
        {(office || election) && <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{office ? `Current party · checked ${office.reviewedOn}` : `Party at ${electionYear ?? "recorded"} election`}</p>
            <p className="mt-1 font-semibold text-slate-900">{office?.party ?? election?.party}</p>
          </div>
        </div>}
      </header>

      <div className="mt-6 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {profile.officeTerms.length > 0 && <section aria-labelledby="office-heading">
            <h2 id="office-heading" className="text-xl font-bold text-slate-900">Offices held</h2>
            <div className="mt-3 grid gap-3">{profile.officeTerms.map((term) => <article key={`${term.title}-${term.startedOn}`} className="rounded-2xl border border-emerald-200 bg-[#f5faf5] px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{term.endedOn ? "Past office" : "Current office"} · {term.startedOn} to {term.endedOn ?? "present"}</p>
              <h3 className="mt-1 text-base font-bold text-slate-900">{term.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{term.constituency}, {term.state} · {term.party}</p>
              <div className="mt-2"><EvidenceLink source={getProfileSource(profile, term.statusSourceId)} /></div>
            </article>)}</div>
          </section>}

          {profile.background && <section className="mt-9" aria-labelledby="background-heading">
            <h2 id="background-heading" className="text-xl font-bold text-slate-900">Education and work</h2>
            <p className="mt-1 text-sm text-slate-600">{profile.background.context}. This is a recorded snapshot, not a complete work history.</p>
            <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">
              {profile.background.educationDetail && <div className="py-4 sm:grid sm:grid-cols-[145px_1fr] sm:gap-5"><dt className="text-sm font-semibold text-slate-500">Education</dt><dd className="mt-1 text-sm font-medium text-slate-900 sm:mt-0">{profile.background.educationDetail}</dd></div>}
              {profile.background.workDescription && <div className="py-4 sm:grid sm:grid-cols-[145px_1fr] sm:gap-5"><dt className="text-sm font-semibold text-slate-500">Work / income stated</dt><dd className="mt-1 text-sm font-medium text-slate-900 sm:mt-0">{profile.background.workDescription}</dd></div>}
            </dl>
            <div className="mt-2"><EvidenceLink source={getProfileSource(profile, profile.background.sourceId)} /></div>
          </section>}

          {profile.career.length > 0 && <section className="mt-9" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-xl font-bold text-slate-900">Career timeline</h2>
            <p className="mt-1 text-sm text-slate-600">Documented public roles and elections. Earlier work may not be recorded.</p>
            <ol className="mt-4 border-l-2 border-emerald-200 pl-5">{profile.timeline.toReversed().map((event) => <li key={`${event.kind}-${event.date}-${event.title}`} className="relative border-b border-slate-200 py-4 last:border-b-0 before:absolute before:-left-[27px] before:top-[23px] before:h-3 before:w-3 before:rounded-full before:bg-emerald-600">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{event.date} · {event.kind === "career" ? "Public role" : "Election"}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{event.title}</h3>
              {event.party && <p className="mt-1 text-sm text-slate-600">{event.kind === "career" ? "Party in this record" : "Party at election"}: {event.party}</p>}
              <div className="mt-2"><EvidenceLink source={getProfileSource(profile, event.sourceId)} /></div>
            </li>)}</ol>
          </section>}

          {profile.activities.length > 0 && <section className="mt-9" aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="text-xl font-bold text-slate-900">Work in office</h2>
            <p className="mt-1 text-sm text-slate-600">Documented actions. Asking a question is not proof that a project was completed.</p>
            <div className="mt-4 grid gap-3">
              {profile.activities.map((activity) => <article key={activity.sourceId} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{activity.date}</p>
                <h3 className="mt-2 font-bold text-slate-900">{activity.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
                <div className="mt-3"><EvidenceLink source={getProfileSource(profile, activity.sourceId)} /></div>
              </article>)}
            </div>
          </section>}

          {(election || profile.disclosures.length > 0) && <details className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
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

        <aside className="grid gap-4">
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
