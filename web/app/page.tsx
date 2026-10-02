import Link from "next/link";
import { jaipurProfile } from "@/lib/verified-profile";

export default function Home() {
  const office = jaipurProfile.officeTerms[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
          Jaipur pilot
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Know who represents your area.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">
          Start with a person, not an election calendar. Read their current role,
          election record, and documented parliamentary activity with links to
          the original sources.
        </p>
      </div>

      <section className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">
          Area available now
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Jaipur Lok Sabha constituency
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Jaipur and Jaipur Rural are different parliamentary constituencies.
          This pilot covers Jaipur only. We cannot identify your MLA from a city
          name or PIN code alone.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="representative-heading">
        <h2 id="representative-heading" className="text-xl font-bold text-slate-900">
          Current representative
        </h2>
        <Link
          href={`/people/${jaipurProfile.slug}`}
          className="mt-4 block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700" aria-hidden="true">
              MS
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold text-slate-900">
                {jaipurProfile.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {office.title} · {office.party}
              </p>
              <p className="mt-3 text-sm font-semibold text-indigo-700">
                Read sourced profile →
              </p>
            </div>
          </div>
        </Link>
        <p className="mt-3 text-xs text-slate-500">
          Office status reviewed {jaipurProfile.reviewedOn}. This is an early,
          incomplete profile and not an endorsement.
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">What comes next?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          As an election approaches, verified nominations can attach to these
          person profiles. Candidate comparison will show all final contesting
          candidates, with missing information left blank.
        </p>
      </section>
    </div>
  );
}
