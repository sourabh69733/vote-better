import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RightsCitation from "@/components/RightsCitation";
import RightsCustodyTimeline from "@/components/RightsCustodyTimeline";
import RightsReading from "@/components/RightsReading";
import { protestTopics, rightsPaths } from "@/lib/protest-guide";
import { currentDslsaHelpline, rightsSources } from "@/lib/rights";

type Props = { params: Promise<{ situation: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { situation } = await params;
  const path = rightsPaths.find((item) => item.id === situation);
  return { title: (path?.title ?? "Rights") + " | Vote Better", description: "Detailed explanations of official Indian law, with citations and Delhi legal aid." };
}

export default async function RightsSituationPage({ params }: Props) {
  const { situation } = await params;
  const path = rightsPaths.find((item) => item.id === situation);
  if (!path) notFound();
  const topics = path.topics.map((id) => protestTopics.find((topic) => topic.id === id)!);
  const helpline = currentDslsaHelpline();
  const showTimeline = ["detained", "arrested", "injured", "family-member-missing"].includes(situation);
  return <div className="mx-auto w-full max-w-[1160px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
    <Link href="/rights" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#1e6b4d] hover:underline">← Protest and rights guide</Link>
    <header className="mt-5 border-b border-[#d9e3da] pb-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2a7658]">India&apos;s laws / Delhi legal help</p>
      <h1 className="mt-4 text-[clamp(2.3rem,5vw,3.8rem)] font-semibold leading-[1.1] tracking-[-0.05em] text-[#19372d]">{path.title}</h1>
      <div className="mt-6 rounded-[22px] border border-[#cbded0] bg-[#edf5ed] p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2a7658]">Start here</p>
        <p className="mt-2 max-w-3xl text-lg leading-8 text-[#254b37]">{topics[0].summary}</p>
        <RightsCitation ids={[...new Set(topics[0].paragraphs.flatMap((paragraph) => paragraph.references))]} />
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-6 text-[#52695a]">Sources checked 10 Oct 2026. Qualified legal review is pending. These paragraphs explain the cited records; the applicable provision, actual order and circumstances determine an individual case.</p>
    </header>
    <div className="grid items-start gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_250px]">
      <div className="min-w-0 space-y-8">
        <section className="rounded-[24px] border border-[#d7e3d8] bg-white px-5 py-5 sm:px-8" aria-labelledby="detail-heading">
          <h2 id="detail-heading" className="text-2xl font-semibold text-[#193b2f]">Understand the details</h2>
          <p className="mt-2 text-base leading-7 text-[#586d5f]">The relevant topics are open below. Collapse a topic to keep only its summary.</p>
          <RightsReading topics={topics} expanded />
        </section>
        {showTimeline && <RightsCustodyTimeline />}
        <section className="rounded-[24px] border border-[#e0d2b4] bg-[#faf6ea] p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-[#66532b]">An order can change the position</h2>
          <p className="mt-3 text-base leading-7 text-[#665b40]">This guide has not verified an event-specific restriction. Section 163 orders have defined acts, locations, people and dates. The actual document and any amendment, extension or withdrawal need checking.</p>
          <RightsCitation ids={["bnss-163", "delhi-orders"]} />
        </section>
      </div>
      <aside className="space-y-5 lg:sticky lg:top-24">
        <section className="rounded-[24px] bg-[#173a34] p-5 text-white">
          <h2 className="text-xl font-semibold">Get human legal help</h2>
          <p className="mt-3 text-sm leading-7 text-[#d7e8dc]">DSLSA provides legal-aid services. Its official contact page is linked below.</p>
          {helpline && <a href={"tel:" + helpline} className="mt-4 inline-flex min-h-11 items-center text-3xl font-bold underline underline-offset-4">{helpline}</a>}
          <p className="mt-2 text-xs leading-6 text-[#d7e8dc]">Contact checked 10 Oct 2026.</p>
          <a href={rightsSources.dslsaAbout.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-bold text-[#174b35]">Official DSLSA contacts ↗</a>
        </section>
        <nav aria-label="Other rights situations" className="rounded-2xl border border-[#d7e3d8] bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#397558]">Other situations</h2>
          <ul className="mt-3">{rightsPaths.filter((item) => item.id !== situation).map((item) => <li key={item.id}><Link href={"/rights/" + item.id} className="flex min-h-11 items-center border-b border-[#e6ece5] py-2 text-sm font-semibold text-[#345a41] hover:underline">{item.title}</Link></li>)}</ul>
        </nav>
      </aside>
    </div>
  </div>;
}
