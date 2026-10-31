import type { Metadata } from "next";
import Link from "next/link";
import { loadDelhiPublication } from "@/lib/delhi";
import { searchDelhiRecords } from "@/lib/delhi-directory";

export const metadata: Metadata = { title: "Delhi public offices | Vote Better", description: "Find Delhi public offices and follow each source." };

const officialDirectories = [
  { title: "Delhi government", detail: "Departments and public services", url: "https://delhi.gov.in/departments-offices" },
  { title: "Chief Minister", detail: "Official profile and office contact", url: "https://delhi.gov.in/cmo" },
  { title: "Delhi ministers", detail: "Council of ministers and offices", url: "https://delhi.gov.in/council-of-ministers-office" },
  { title: "Assembly members", detail: "Official 8th Assembly roster (PDF)", url: "https://delhiassembly.delhi.gov.in/sites/default/files/2025-07/list_of_members.pdf" },
  { title: "Members of Parliament", detail: "Lok Sabha member directory", url: "https://sansad.in/ls/members" },
  { title: "Police", detail: "Find a station and official contacts", url: "https://delhipolice.gov.in/kyps" },
  { title: "Delhi High Court", detail: "Court and judge information", url: "https://www.delhihighcourt.nic.in/web/" },
  { title: "District Courts", detail: "District courts and public notices", url: "https://delhidistrictcourts.nic.in/" },
  { title: "Legal help", detail: "Delhi State Legal Services Authority", url: "https://delhi.nalsa.gov.in/" },
  { title: "Advocate enrolment", detail: "Check an enrolment number", url: "https://www.delhibarcouncil.com/bcd/enrolment_index.php" },
];

const coverageNames: Record<string, string> = {
  "gnctd-services-officers": "GNCTD Services officers",
  "delhi-assembly-secretariat": "Assembly Secretariat",
  "delhi-police-contacts": "Delhi Police contacts",
  "gnctd-ministers": "Delhi ministers",
  "gnctd-mps": "Delhi MPs",
};

export default async function DelhiPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const publication = await loadDelhiPublication();
  const results = searchDelhiRecords(publication, query);
  const preview = publication.audience === "preview";
  const isPin = /^\d{6}$/.test(query);

  return <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
    <div className="grid gap-8 border-b border-[#d9e3da] pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-end">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#286b4e]">Delhi public information</p>
        <h1 className="mt-4 max-w-3xl text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.07em] text-[#19372d]">Find the office.<br /><span className="text-[#43896a]">Check the source.</span></h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#52675a]">Explore public offices, the people listed in official records, and where to get help. Each listing shows what was checked and when.</p>
      </div>
      <form action="/delhi" method="get" role="search" className="rounded-[24px] border border-[#d7e4d8] bg-white p-5 shadow-[0_16px_40px_rgba(26,61,39,.06)] sm:p-6">
        <label htmlFor="delhi-query" className="block text-sm font-bold text-[#204b36]">Search an office or person</label>
        <div className="mt-3 flex gap-2">
          <input id="delhi-query" name="q" type="search" defaultValue={query} placeholder="e.g. police, Secretary" className="min-w-0 flex-1 rounded-xl border border-[#bfd2c2] bg-[#fbfdfb] px-4 py-3 text-base text-[#19372d] outline-none focus-visible:ring-2 focus-visible:ring-[#1e6b4d]" />
          <button type="submit" className="min-h-12 rounded-xl bg-[#1e6b4d] px-5 text-sm font-bold text-white hover:bg-[#16563c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e6b4d]">Search</button>
        </div>
        <p className="mt-3 text-sm leading-5 text-[#607466]">A PIN alone cannot identify every public office or police station.</p>
      </form>
    </div>

    <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.7fr)] lg:gap-12">
      <section aria-labelledby="directory-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#4c8063]">Directory</p><h2 id="directory-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">{query ? `Results for “${query}”` : "Checked listings"}</h2></div>
          <span className="rounded-full border border-[#d3dfd3] px-3 py-1 text-sm font-semibold text-[#526a59]">{results.length} shown</span>
        </div>
        {preview && <p className="mt-4 rounded-2xl border border-[#d9d5b9] bg-[#faf8eb] px-4 py-3 text-sm leading-6 text-[#605b38]">Local research preview. These pages list what an official source showed; current tenure and republication rights are still under review.</p>}
        {isPin ? <p className="mt-5 rounded-2xl border border-[#d7e4d8] bg-white p-5 text-sm leading-6 text-[#435b4a]">We cannot map this PIN to a constituency or police boundary yet. Use the official station finder below, or search an office by name.</p> : null}
        {!isPin && results.length === 0 && <p className="mt-5 rounded-2xl border border-[#d7e4d8] bg-white p-5 text-sm leading-6 text-[#435b4a]">{query ? "No checked listing matches this search. Try an official directory below." : "Checked Delhi listings are being reviewed. Use the official directories below while coverage grows."}</p>}
        <div className="mt-5 grid gap-3">
          {results.map(({ institution, office, holders, coverage, trace }) => <Link key={office.id} href={`/delhi/institutions/${institution.id}#office-${office.id}`} className="group block rounded-[22px] border border-[#d8e5d9] bg-white p-5 transition-colors hover:border-[#9ec6a6] hover:bg-[#fbfdfb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e6b4d] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#4c8063]">{institution.name}</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#19372d]">{office.title}</h3></div><span className="text-sm font-semibold text-[#246c4a]">Open →</span></div>
            {holders.length > 0 && <p className="mt-3 text-sm text-[#3f5748]">{holders.map((item) => item.person.name).join(", ")}</p>}
            <p className="mt-3 text-xs text-[#65776b]">Source listed · {coverage === "stale" ? "Source check is stale · " : ""}Captured {new Date(trace.capturedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </Link>)}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-[24px] bg-[#173a34] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a6d8b7]">Know your rights</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Find official law and legal aid.</h2><p className="mt-3 text-sm leading-6 text-[#d4e6d8]">Start with the official text and Delhi legal services. Plain-language custody guides require legal review.</p><Link href="/rights" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-[#174b35] hover:bg-[#e9f3ec]">Open rights resources →</Link></section>
        <section aria-labelledby="sources-heading"><h2 id="sources-heading" className="text-lg font-semibold text-[#19372d]">Official directories</h2><p className="mt-2 text-sm leading-6 text-[#65776a]">An official page may still lag behind a change in office.</p><div className="mt-3 grid gap-2">{officialDirectories.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-[#dae5da] bg-white p-4 hover:border-[#9ec6a6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e6b4d]"><span className="block font-semibold text-[#1c6047]">{item.title} ↗</span><span className="mt-1 block text-sm text-[#64776a]">{item.detail}</span></a>)}</div></section>
      </aside>
    </div>
    <section aria-labelledby="coverage-heading" className="border-t border-[#d9e3da] pt-9"><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#528166]">Data transparency</p><h2 id="coverage-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">What is covered?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607466]">A captured row is a source claim. Only individually reviewed rows appear as listings. The full number of Delhi offices is not established.</p><div className="mt-5 grid gap-3 md:grid-cols-3">{publication.coverage.length ? publication.coverage.map((item) => <article key={item.sourceId} className="rounded-[20px] border border-[#d8e5d9] bg-white p-5"><h3 className="font-semibold text-[#1d4a35]">{coverageNames[item.sourceId] ?? item.sourceId}</h3><p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">{item.publishedRows} <span className="text-base font-normal text-[#66796d]">/ {item.observedRows ?? "?"} source rows reviewed</span></p><p className="mt-2 text-sm text-[#64776a]">{item.state === "stale" ? "Last check may be stale" : item.state === "missing" ? "No captured source yet" : "Partial coverage"} · Expected total unknown</p></article>) : <p className="rounded-[20px] border border-[#d8e5d9] bg-white p-5 text-sm leading-6 text-[#64776a]">No Delhi source rows have been published yet. Official directories remain available above.</p>}</div></section>
  </div>;
}
