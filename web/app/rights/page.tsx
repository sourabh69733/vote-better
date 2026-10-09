import type { Metadata } from "next";
import Link from "next/link";
import { currentDslsaHelpline, rightsSituations, rightsSources } from "@/lib/rights";

export const metadata: Metadata = { title: "Rights and legal help | Vote Better", description: "Official law and Delhi legal aid for common situations." };

export default function RightsPage() {
  const helpline = currentDslsaHelpline();
  return <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-9 sm:px-6 sm:pt-14 lg:px-8">
    <Link href="/delhi" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#1e6b4d] hover:underline">← Delhi directory</Link>
    <header className="mt-5 border-b border-[#d9e3da] pb-10"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2a7658]">Delhi / Rights and help</p><h1 className="mt-4 max-w-3xl text-[clamp(2.5rem,5vw,4.4rem)] font-semibold leading-[1.05] tracking-[-0.07em] text-[#19372d]">Start with your situation.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#536a5b]">Find the official law, police directory, and Delhi legal aid. Plain-language instructions are being legally reviewed.</p><div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#c9ddce] bg-white px-5 py-4"><span className="font-semibold text-[#254e38]">Need legal help now?</span>{helpline ? <a href={`tel:${helpline}`} className="font-bold text-[#1c6047] underline underline-offset-4">DSLSA {helpline}</a> : <a href={rightsSources.dslsa.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#1c6047] underline underline-offset-4">Open Delhi legal aid ↗</a>}<span className="text-sm text-[#617567]">{helpline ? "Official number checked 9 Oct 2026" : "Check the current official contact"}</span></div></header>
    <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-labelledby="situations-heading"><h2 id="situations-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">Choose a situation</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{rightsSituations.map((item) => <Link key={item.id} href={`/rights/${item.id}`} className="flex min-h-24 items-center justify-between gap-4 rounded-[22px] border border-[#d8e5d9] bg-white p-5 text-lg font-semibold text-[#1e4d38] hover:border-[#9bc7a5] hover:bg-[#fbfdfb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e6b4d]"><span>{item.title}</span><span aria-hidden="true">→</span></Link>)}</div></section>
      <aside className="rounded-[24px] bg-[#173a34] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a6d8b7]">Legal aid</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Delhi State Legal Services Authority</h2>{helpline && <p className="mt-4 text-base leading-7">Official helpline, checked 9 Oct 2026: <a href={`tel:${helpline}`} className="font-bold text-white underline underline-offset-4">{helpline}</a></p>}<a href={rightsSources.dslsa.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-[#174b35] hover:bg-[#e9f3ec]">Open official legal aid ↗</a></aside>
    </div>
    <p className="border-t border-[#d9e3da] pt-6 text-sm leading-6 text-[#66796d]">The official law and a qualified lawyer should guide urgent decisions. We have not published an unreviewed legal checklist.</p>
  </div>;
}
