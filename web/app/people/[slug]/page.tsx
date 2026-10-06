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
  const voteTraceId = getJaipurVoteTraceId(profile.slug);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link href={area ? `/areas/${area.id}` : "/"} className="text-sm font-semibold text-emerald-800 hover:underline">
        ← {area ? area.label : "Verified areas"}
      </Link>

      <header className={`mt-6 grid gap-8 rounded-[26px] border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-8 lg:items-end lg:p-10 ${office ? "" : "lg:grid-cols-[minmax(0,1fr)_300px]"}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">At a glance · reviewed {profile.reviewedOn}</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{profile.name}</h1>
          {office && <>
            <p className="mt-4 text-base text-slate-700">{office.title} · {office.constituency}, {office.state}</p>
            <p className="mt-1 text-sm text-slate-600">{office.party}</p>
            <p className="mt-2 text-sm text-slate-600">Current term: {office.startedOn} to present · Status reviewed {office.reviewedOn}</p>
          </>}
          {!office && election && <>
            <p className="mt-4 text-base text-slate-700">{election.election} · {electionStatus}</p>
            {election.party && <p className="mt-1 text-sm text-slate-600">{election.party}</p>}
          </>}
        </div>
        {!office && election && <div className="rounded-2xl bg-[#eaf4ec] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Election result</p>
          {election.votes !== undefined && <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{election.votes.toLocaleString("en-IN")} <span className="text-sm font-medium text-slate-600">votes</span></p>}
          {election.resultDate && <p className="mt-1 text-xs text-slate-600">Declared {election.resultDate}</p>}
          <div className="mt-3"><EvidenceLink source={getProfileSource(profile, election.sourceId)} /></div>
        </div>}
      </header>

      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
        <div>
          {profile.officeTerms.length > 0 && <section aria-labelledby="office-heading">
            <h2 id="office-heading" className="text-xl font-bold text-slate-900">Offices held</h2>
            <div className="mt-3 grid gap-3">{profile.officeTerms.map((term) => <article key={`${term.title}-${term.startedOn}`} className="rounded-2xl border border-emerald-200 bg-[#f5faf5] p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{term.endedOn ? "Past office" : "Current office · verified"}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{term.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{term.constituency}, {term.state} · {term.party}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{term.startedOn} to {term.endedOn ?? "present"} · Status reviewed {term.reviewedOn}</p>
              <div className="mt-4 flex flex-wrap gap-3">{[term.statusSourceId, term.biographySourceId].map((id) => <EvidenceLink key={id} source={getProfileSource(profile, id)} />)}</div>
            </article>)}</div>
          </section>}

          {profile.activities.length > 0 && <section className="mt-8" aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="text-xl font-bold text-slate-900">Work and outcomes</h2>
            <p className="mt-2 text-sm text-slate-600">Dated actions with source documents. A question or request does not by itself prove a result.</p>
            <div className="mt-3 grid gap-3">
              {profile.activities.map((activity) => <article key={activity.sourceId} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{activity.date}</p>
                <h3 className="mt-2 font-bold text-slate-900">{activity.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
                <div className="mt-3"><EvidenceLink source={getProfileSource(profile, activity.sourceId)} /></div>
              </article>)}
            </div>
          </section>}

          {profile.timeline.length > 0 && <section className="mt-8" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-xl font-bold text-slate-900">Public life</h2>
            <p className="mt-2 text-sm text-slate-600">Offices and elections with the party recorded for each event. This does not establish when a party change happened.</p>
            <ol className="mt-4 grid gap-3">{profile.timeline.map((event) => <li key={`${event.kind}-${event.date}-${event.title}`} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{event.date} · {event.kind === "office" ? "Office" : "Election"}</p>
              <h3 className="mt-2 font-semibold text-slate-900">{event.title}</h3>
              {event.party && <p className="mt-1 text-sm text-slate-600">{event.kind === "office" ? "Party recorded for office" : "Party at election"}: {event.party}</p>}
              <div className="mt-3"><EvidenceLink source={getProfileSource(profile, event.sourceId)} /></div>
            </li>)}</ol>
          </section>}

          {profile.publicProfiles.length > 0 && <section className="mt-8" aria-labelledby="presence-heading">
            <h2 id="presence-heading" className="text-xl font-bold text-slate-900">Official presence</h2>
            <div className="mt-3 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              {profile.publicProfiles.map((link) => <div key={link.sourceId}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{link.label}</p>
                <EvidenceLink source={getProfileSource(profile, link.sourceId)} />
              </div>)}
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

        <aside>
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
