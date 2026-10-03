import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileSource, jaipurProfile, type SourceRecord } from "@/lib/verified-profile";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [{ slug: jaipurProfile.slug }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug === jaipurProfile.slug ? `${jaipurProfile.name} | Vote Better` : "Profile not found",
  };
}

function EvidenceLink({ source }: { source: SourceRecord }) {
  return <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950">
    {source.title} ↗
  </a>;
}

export default async function PersonPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug !== jaipurProfile.slug) notFound();

  const profile = jaipurProfile;
  const office = profile.officeTerms[0];
  const election = profile.candidacies[0];
  const memberSource = getProfileSource(profile, office.biographySourceId);
  const currentMembersSource = getProfileSource(profile, office.statusSourceId);
  const electionSource = getProfileSource(profile, election.sourceId);

  return <div className="mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
    <Link href="/" className="text-sm font-semibold text-emerald-800 hover:underline">← Jaipur pilot</Link>

    <header className="mt-6 grid gap-8 rounded-[26px] border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end lg:p-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Person profile · reviewed {profile.reviewedOn}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{profile.name}</h1>
        <p className="mt-4 text-base text-slate-700">{office.title} · {office.constituency}, {office.state}</p>
        <p className="mt-1 text-sm text-slate-600">{office.party}</p>
      </div>
      <div className="rounded-2xl bg-[#eaf4ec] p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Current role evidence</p>
        <div className="mt-3 grid gap-2"><EvidenceLink source={currentMembersSource} /><EvidenceLink source={memberSource} /></div>
      </div>
    </header>

    <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
      <div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
          This is a limited pilot profile. It shows selected sourced records, not a
          complete account of her work or a judgment about her performance.
        </div>

        <section className="mt-8" aria-labelledby="office-heading">
          <h2 id="office-heading" className="text-xl font-bold text-slate-900">Current role</h2>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="font-semibold text-slate-900">{office.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Elected from Jaipur in June 2024. The current members list showed
              her as sitting when reviewed on {profile.reviewedOn}.
            </p>
            <div className="mt-4 flex flex-wrap gap-3"><EvidenceLink source={memberSource} /><EvidenceLink source={currentMembersSource} /></div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-xl font-bold text-slate-900">Documented activity</h2>
          <p className="mt-2 text-sm text-slate-600">Selected parliamentary records, ordered by date. Asking a question does not mean a project was completed.</p>
          <div className="mt-3 grid gap-3">
            {profile.activities.map((activity) => <article key={activity.sourceId} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{activity.date}</p>
              <h3 className="mt-2 font-bold text-slate-900">{activity.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
              <div className="mt-3"><EvidenceLink source={getProfileSource(profile, activity.sourceId)} /></div>
            </article>)}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="election-heading">
          <h2 id="election-heading" className="text-xl font-bold text-slate-900">Election record</h2>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="font-semibold text-slate-900">{election.election}</p>
            {election.status === "elected" && <p className="mt-2 text-sm leading-6 text-slate-600">
              The returning officer declared {profile.name} elected on 4 June 2024.
              {election.votes !== undefined && <> The return records {election.votes.toLocaleString("en-IN")} votes for her.</>}
            </p>}
            <div className="mt-3"><EvidenceLink source={electionSource} /></div>
          </div>
        </section>
      </div>

      <aside className="grid gap-5 xl:sticky xl:top-24">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6" aria-labelledby="coverage-heading">
          <h2 id="coverage-heading" className="text-lg font-bold text-slate-900">Records still under review</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Affidavit details, attendance totals, local project outcomes and
            social account ownership have not been verified for this pilot. No
            values or links are shown for them yet.
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="text-lg font-bold text-slate-900">Source register</h2>
          <ul className="mt-4 grid gap-4">
            {profile.sources.map((source) => <li key={source.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
              <EvidenceLink source={source} />
              <p className="mt-1 text-xs text-slate-500">Checked {source.checkedOn}</p>
            </li>)}
          </ul>
        </section>
      </aside>
    </div>
  </div>;
}
