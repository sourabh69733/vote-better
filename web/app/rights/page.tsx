import type { Metadata } from "next";
import Link from "next/link";
import ProtestExplorer from "@/components/ProtestExplorer";
import RightsCitation from "@/components/RightsCitation";
import RightsCustodyTimeline from "@/components/RightsCustodyTimeline";
import RightsReading from "@/components/RightsReading";
import { protestTopics, rightsGlossary, rightsGroups, rightsPaths } from "@/lib/protest-guide";
import { currentDslsaHelpline, rightsSources } from "@/lib/rights";
import { rightsReferences } from "@/lib/rights-references";

export const metadata: Metadata = {
  title: "Protest, police and your rights | Vote Better",
  description: "Explore India's core protest laws, Delhi permissions, FIRs, arrest safeguards and legal aid with official citations.",
};

export default function RightsPage() {
  const helpline = currentDslsaHelpline();
  const explorerIds = ["peaceful-protest", "dispersal", "questioning", "preventive-action", "arrest-safeguards", "fir-process"];
  return <div className="mx-auto w-full max-w-[1360px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
    <Link href="/delhi" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#1e6b4d] hover:underline">← Delhi directory</Link>
    <header className="mt-5 border-b border-[#d9e3da] pb-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2a7658]">India&apos;s laws / Delhi context</p>
      <div className="mt-4 grid items-end gap-6 lg:grid-cols-[1fr_300px]">
        <div><h1 className="max-w-3xl text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[1.05] tracking-[-0.06em] text-[#19372d]">Understand your rights.<br /><span className="text-[#39775a]">One situation at a time.</span></h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#526858]">Protesting, going alone or in a group, police directions, FIRs and arrest. Start with the map, then open a topic for the detail and the law behind it.</p></div>
        <div className="rounded-2xl border border-[#c9ddce] bg-white p-5">
          <p className="text-sm font-bold text-[#254e38]">Need a lawyer now?</p>
          <a href={helpline ? "tel:" + helpline : rightsSources.dslsaAbout.url} className="mt-2 inline-flex min-h-11 items-center text-2xl font-semibold text-[#1c6047] underline underline-offset-4">{helpline ? "Delhi legal aid: " + helpline : "Open Delhi legal aid ↗"}</a>
          <p className="mt-2 text-sm leading-6 text-[#617567]">Source checked 10 Oct 2026.</p>
          <RightsCitation ids={["dslsa"]} />
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm leading-6 text-[#58705e]">
        <span><strong className="text-[#355240]">{protestTopics.length} topics</strong> with linked legal references</span>
        <span>Sources checked 10 Oct 2026</span>
        <span>Qualified legal review: pending</span>
      </div>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-[#607466]">This is a source-based explanation of core rules, not an exhaustive legal handbook or advice on an individual case. Event-specific orders, special statutes and child-specific procedures may change the position.</p>
    </header>

    <div className="grid items-start gap-8 pt-8 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-8">
        <ProtestExplorer topics={protestTopics.filter((topic) => explorerIds.includes(topic.id))} />
        <section className="rounded-[24px] border border-[#e0d2b4] bg-[#faf6ea] p-5 sm:p-6" aria-labelledby="location-heading">
          <h2 id="location-heading" className="text-xl font-semibold text-[#66532b]">Your location and date still matter</h2>
          <p className="mt-3 text-base leading-7 text-[#665b40]">A section 163 order can apply to an individual, an area or people visiting it. This page has not verified an order for your event. The written order, its boundaries, dates, prohibited acts and any amendments must be examined before drawing a conclusion.</p>
          <RightsCitation ids={["bnss-163", "delhi-orders"]} />
        </section>
        <RightsCustodyTimeline />
        <section aria-labelledby="detail-heading" id="detailed-guide" className="scroll-mt-28">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#397558]">Go deeper</p>
          <h2 id="detail-heading" className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#193b2f]">The law, explained in detail</h2>
          <p className="mt-3 text-base leading-7 text-[#52685a]">Open a topic. Each paragraph links to the statute, judgment or official service it describes.</p>
          {rightsGroups.map((group) => <section id={group.id} key={group.id} aria-labelledby={group.id + "-heading"} className="mt-8 scroll-mt-28 rounded-[24px] border border-[#d7e3d8] bg-white px-5 py-6 sm:px-8">
            <h3 id={group.id + "-heading"} className="text-2xl font-semibold tracking-[-0.03em] text-[#193b2f]">{group.title}</h3>
            <p className="mb-3 mt-2 text-base leading-7 text-[#586d5f]">{group.description}</p>
            <RightsReading topics={protestTopics.filter((topic) => topic.group === group.id)} />
          </section>)}
        </section>
        <section id="glossary" className="scroll-mt-28 rounded-[24px] border border-[#d7e3d8] bg-white p-5 sm:p-8" aria-labelledby="glossary-heading">
          <h2 id="glossary-heading" className="text-2xl font-semibold text-[#193b2f]">The words, in plain language</h2>
          <dl className="mt-5 grid gap-6 sm:grid-cols-2">{rightsGlossary.map((item) => <div key={item.term}>
            <dt className="font-bold text-[#284d39]">{item.term}</dt><dd className="mt-2 text-base leading-7 text-[#516658]">{item.text}<RightsCitation ids={item.references} /></dd>
          </div>)}</dl>
        </section>
        <section id="source-register" className="scroll-mt-28 rounded-[24px] border border-[#d7e3d8] bg-white p-5 sm:p-8" aria-labelledby="register-heading">
          <h2 id="register-heading" className="text-2xl font-semibold text-[#193b2f]">Inspect the sources</h2>
          <p className="mt-3 text-base leading-7 text-[#516658]">PDF links open the cited document near the relevant page. The locator identifies the exact provision; a source-check date records our reading, not lawyer approval or a promise that a later amendment has been checked.</p>
          <details className="mt-5">
            <summary className="min-h-11 cursor-pointer py-3 font-bold text-[#176447] focus-visible:outline-2 focus-visible:outline-offset-4">Show all {Object.keys(rightsReferences).length} references</summary>
            <ul className="mt-4 divide-y divide-[#dce5dd]">{Object.entries(rightsReferences).map(([id, source]) => <li key={id} className="py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#657968]">{source.kind === "judgment" ? "Court judgment" : source.kind === "service" ? "Official service / publication" : "Statutory text"}</p>
              <RightsCitation ids={[id]} />
              <p className="mt-1 text-sm leading-6 text-[#566b5c]">{source.locator}</p>
              <p className="mt-1 text-xs text-[#637866]">Source checked: {source.checkedAt}</p>
            </li>)}</ul>
          </details>
        </section>
      </div>
      <aside className="space-y-6 xl:sticky xl:top-24">
        <nav aria-label="Rights guide chapters" className="rounded-2xl border border-[#d7e3d8] bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#397558]">On this page</p>
          <ul className="mt-3">{rightsGroups.map((group) => <li key={group.id}><a href={"#" + group.id} className="flex min-h-12 items-center border-b border-[#e6ece5] py-2 text-sm font-semibold leading-6 text-[#345a41] hover:text-[#176447] focus-visible:outline-2 focus-visible:outline-offset-2">{group.title}</a></li>)}</ul>
          <a href="#glossary" className="flex min-h-11 items-center text-sm font-semibold text-[#345a41] hover:underline">Plain-language glossary</a>
          <a href="#source-register" className="flex min-h-11 items-center text-sm font-semibold text-[#345a41] hover:underline">Source register</a>
        </nav>
        <nav aria-label="Detailed situation pages" className="rounded-2xl bg-[#183d32] p-5 text-white">
          <h2 className="text-lg font-semibold">Go straight to your situation</h2>
          <ul className="mt-3">{rightsPaths.map((path) => <li key={path.id}><Link href={"/rights/" + path.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-white/15 py-2 text-sm font-semibold leading-6 text-[#e0ede1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{path.title}<span aria-hidden="true">→</span></Link></li>)}</ul>
        </nav>
      </aside>
    </div>
  </div>;
}
