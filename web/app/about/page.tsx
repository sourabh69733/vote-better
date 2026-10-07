import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900">About Vote Better</h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-slate-700">
        Vote Better aims to help people understand who represents them and who
        contests their elections. Each area, office and person is added with
        checked public records. Jaipur and Jaipur Rural Lok Sabha constituencies
        are the first areas in this growing directory.
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
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Current verified area coverage includes Jaipur and Jaipur Rural parliamentary
            constituencies. The MP directory can show 64 source checked Digital Sansad profiles across India when its private export is installed. Source reuse permission is still pending. We have not verified assembly-area mapping, other
            representatives, candidate social accounts, or a complete record
            of constituency work. Each profile shows when its sources were checked.
          </p>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Other sources to connect</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">These sources are not connected to the 64 MP profiles. A few Jaipur candidate disclosures cite MyNeta manually. Its terms require written consent for automated collection, so there is no MyNeta scraper.</p>
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
        ← Back to verified areas
      </Link>
    </div>
  );
}
