import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentDslsaHelpline, rightsSituations, rightsSources } from "@/lib/rights";

export const metadata: Metadata = { title: "Official rights sources | Vote Better" };

export default async function RightsSituationPage({ params }: { params: Promise<{ situation: string }> }) {
  const { situation } = await params;
  const item = rightsSituations.find((entry) => entry.id === situation);
  if (!item) notFound();
  const helpline = currentDslsaHelpline();
  return <div className="mx-auto w-full max-w-[920px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
    <Link href="/rights" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#1e6b4d] hover:underline">← All situations</Link>
    <header className="mt-5 border-b border-[#d9e3da] pb-8"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2a7658]">Official sources / Delhi</p><h1 className="mt-3 text-[clamp(2.3rem,5vw,3.8rem)] font-semibold leading-[1.07] tracking-[-0.06em] text-[#19372d]">{item.title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#52695a]">A plain-language guide for this situation has not passed legal review yet. Use these official sources and contact Delhi legal aid for advice about your case.</p></header>
    <section aria-labelledby="sources-heading" className="py-9"><h2 id="sources-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">Read the official sources</h2><div className="mt-5 grid gap-3">{item.sourceIds.map((id) => { const source = rightsSources[id]; return <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="flex min-h-20 items-center justify-between gap-4 rounded-[20px] border border-[#d7e4d8] bg-white p-5 font-semibold text-[#1e6045] hover:border-[#9bc7a5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e6b4d]"><span>{source.title}</span><span aria-hidden="true">↗</span></a>; })}</div></section>
    <section className="rounded-[24px] bg-[#173a34] p-6 text-white sm:p-8"><h2 className="text-xl font-semibold">Get legal help</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#d7e8dc]">Delhi State Legal Services Authority provides official legal-aid information and local contact paths.</p>{helpline && <p className="mt-4">Helpline checked 9 Oct 2026: <a href={`tel:${helpline}`} className="font-bold underline underline-offset-4">{helpline}</a></p>}<a href={rightsSources.dslsa.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-[#174b35]">Open DSLSA ↗</a></section>
  </div>;
}
