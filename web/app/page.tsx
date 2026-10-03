import Link from "next/link";
import { getAreaOverview } from "@/lib/civic-area";

export default function Home() {
  const overview = getAreaOverview("jaipur-lok-sabha");
  if (!overview) throw new Error("Jaipur pilot area is missing");

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-10">
      <div className="rounded-[28px] bg-[#173a34] px-6 py-10 text-white sm:px-10 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-200">
          Jaipur pilot · At a glance
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-0.05em] sm:text-5xl">
          Know who represents this area.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-100 sm:text-base">
          Start with the verified office holder. Open their profile for the
          election record and documented activity behind each claim.
        </p>
        <div className="mt-8 inline-flex flex-col rounded-xl border border-white/25 bg-white/10 px-5 py-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            Area currently covered
          </span>
          <strong className="mt-1 text-lg">{overview.area.label}</strong>
          <span className="mt-1 text-xs text-emerald-100">
            {overview.area.state} · {overview.links.length} verified office link
          </span>
        </div>
      </div>

      <section className="mt-10" aria-labelledby="representatives-heading">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Representation
            </p>
            <h2 id="representatives-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Verified representative
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            Every area-to-person link needs an election or appointment record
            and a current status check.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {overview.links.map((link) => (
            <article key={link.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-base font-extrabold text-emerald-800" aria-hidden="true">
                  {link.person.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    {link.office.title} · {overview.area.name}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    {link.person.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Elected on {link.startedOn}. Digital Sansad listed her as a
                    sitting member when this relationship was reviewed on {link.reviewedOn}.
                  </p>
                  <Link href={`/people/${link.person.slug}`} className="mt-4 inline-block text-sm font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-950">
                    Open sourced profile →
                  </Link>
                  <Link href="/areas/jaipur/relationships" className="ml-5 mt-4 inline-block text-sm font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-950">
                    Explore this connection →
                  </Link>
                </div>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Records behind this link
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {link.sources.map((source) => (
                    <li key={source.id}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950">
                        {source.title} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6" aria-labelledby="coverage-heading">
        <h2 id="coverage-heading" className="text-base font-bold text-slate-900">
          Coverage limit
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This pilot covers the Jaipur parliamentary constituency only. We have
          not mapped an Assembly area, ward, appointed official or service office
          to your location. PIN and browser location lookup will follow verified
          boundary data.
        </p>
      </section>
    </div>
  );
}
