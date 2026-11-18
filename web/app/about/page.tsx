import Link from "next/link";

import { formatDay, todayIso } from "@/lib/elections";
import { freshnessOf, sourceStatuses, type Freshness } from "@/lib/sync-status";

export const revalidate = 3600;

const FRESHNESS: Record<Exclude<Freshness, "current">, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-[#fdf1df] text-warn" },
  retrying: { label: "Last check failed, retrying", className: "bg-[#fdf1df] text-warn" },
  "not-checked": { label: "Not checked yet", className: "bg-track text-body" },
};

export default function AboutPage() {
  const today = todayIso();
  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900">About Vote Better</h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-slate-700">
        Vote Better helps people understand who represents them and who contests
        their elections. Each area, office and person is added with checked public
        records. Results cover the whole country; Jaipur and Jaipur Rural are the
        first areas with full profiles.
      </p>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">How we handle evidence</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-slate-700">
            <li>Each displayed factual record links to its original source.</li>
            <li>Office status is checked at a stated date and can change.</li>
            <li>Parliamentary questions show activity, not completed local work.</li>
            <li>MP biography fields checked against saved Sansad responses are labelled as source checked. Independent review is a separate step.</li>
            <li>Missing information is left blank rather than shown as zero.</li>
            <li>There is no candidate ranking or recommendation yet.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Current scope</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-slate-700">
            <li>Results: every Lok Sabha seat in 2024, 2019 and 2014, and every Rajasthan assembly seat in 2023.</li>
            <li>Candidate lists: who filed and who was on the ballot in the October 2026 bye-elections. New elections are added once they are announced.</li>
            <li>Full profiles and MP fund works: the MPs for Jaipur and Jaipur Rural.</li>
            <li>Not covered yet: assembly results outside Rajasthan, city wards and councillors, affidavit details outside Jaipur, and a complete record of constituency work.</li>
            <li>Switched off until reuse terms are confirmed: finding your seat by PIN, and the Digital Sansad MP directory.</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">Each page shows when its sources were checked.</p>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-xl font-bold text-slate-900">Sources and when we last checked them</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">A scheduled job checks each source for changes. New data reaches the site only after a person reviews it.</p>
        <ul className="mt-4 divide-y divide-line">
          {sourceStatuses.map((source) => {
            const freshness = freshnessOf(source, today);
            return (
              <li key={source.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-link underline underline-offset-4">{source.title} ↗</a>
                  <p className="text-xs text-subtle">{source.owner} · {source.refreshDays === null ? "fixed archive" : `checked every ${source.refreshDays === 1 ? "day" : `${source.refreshDays} days`}`}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
                  {source.lastChecked && <span className="text-body">Last checked {formatDay(source.lastChecked)}</span>}
                  {freshness !== "current" && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${FRESHNESS[freshness].className}`}>{FRESHNESS[freshness].label}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Other sources to connect</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">These sources are not connected to the MP profiles. A few Jaipur candidate disclosures cite MyNeta manually. Its terms require written consent for automated collection, so there is no MyNeta scraper.</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-emerald-800">
          <li><a href="https://www.eci.gov.in/affidavit-portal" target="_blank" rel="noopener noreferrer" className="underline">Election Commission affidavits</a> for candidates&apos; filed disclosures</li>
          <li><a href="https://prsindia.org/mptrack" target="_blank" rel="noopener noreferrer" className="underline">PRS MP Track</a> for parliamentary participation</li>
          <li><a href="https://www.myneta.info/" target="_blank" rel="noopener noreferrer" className="underline">MyNeta</a> for affidavit summaries across elections</li>
        </ul>
      </section>

      <p className="mt-8 text-sm text-slate-600">
        This independent open-source project is not affiliated with the
        Election Commission, Parliament or any political party.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold text-emerald-800 hover:underline">
        ← Home
      </Link>
    </div>
  );
}
