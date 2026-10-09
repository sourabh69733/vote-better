import type { Metadata } from "next";
import Link from "next/link";
import { constitutionSource } from "@/lib/constitution";
import { constitutionQuestions, constitutionReviewNote, constitutionTopics } from "@/records/constitution";
import { constitutionGuides } from "@/records/constitution-guides";
import AskQuestion from "./AskQuestion";
import BillToLaw from "./BillToLaw";
import WhoDoesWhat from "./WhoDoesWhat";

export const metadata: Metadata = {
  title: "The Constitution, simply | Vote Better",
  description: "Plain-language answers about the Constitution of India, with the articles behind each one.",
};

function SectionHeading({ index, title, text, id }: { index: string; title: string; text: string; id: string }) {
  return (
    <div className="mb-6 max-w-2xl">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#528166]">{index}</p>
      <h2 id={id} className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#19372d]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#66796d]">{text}</p>
    </div>
  );
}

export default function ConstitutionPage() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 pb-14 pt-10 sm:px-6 sm:pt-16 lg:px-8">
      <header className="grid gap-8 border-b border-[#d9e3da] pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-start lg:gap-16">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#2a7658]">Constitution of India</p>
          <h1 className="mt-5 text-[clamp(2.5rem,5vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.075em] text-[#19372d]">
            Your Constitution, <span className="block text-[#43896a]">in plain words.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#576c60]">
            Ask a question or pick a topic. Every answer names the article it comes from, so you can check the original.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Topics">
            {constitutionTopics.map((topic) => (
              <a key={topic.id} href={`#${topic.id}`} className="rounded-full border border-[#cfdccf] px-3.5 py-1.5 text-sm font-semibold text-[#2c6249] hover:bg-[#e8f2e9]">{topic.question}</a>
            ))}
          </nav>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/rights" className="inline-flex min-h-11 items-center gap-3 rounded-full border border-[#bad4c0] bg-white px-5 text-sm font-bold text-[#1c6047] hover:bg-[#eaf4eb]">Delhi rights and legal help →</Link>
            {constitutionGuides.map((guide) => (
              <Link key={guide.id} href={`/constitution/${guide.id}`} className="inline-flex min-h-11 items-center gap-3 rounded-full bg-[#1c6047] px-5 text-sm font-bold text-white hover:bg-[#154c38]">
                Guide: {guide.title} <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
        <AskQuestion questions={constitutionQuestions} />
      </header>

      <section className="py-12" aria-labelledby="who-heading">
        <SectionHeading index="01 / Who handles what" id="who-heading" title="Union, State or Local?" text="The Constitution decides which level of government is responsible for what. Knowing this tells you whom to ask." />
        <WhoDoesWhat />
      </section>

      <section className="border-t border-[#d9e3da] py-12" aria-labelledby="topics-heading">
        <SectionHeading index="02 / Topics" id="topics-heading" title="The big ideas" text="A short answer first. Open a topic for the details and articles." />
        <div className="grid gap-4">
          {constitutionTopics.map((topic) => (
            <article key={topic.id} id={topic.id} className="scroll-mt-24 overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white">
              <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)] lg:gap-10">
                <div>
                  <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#18372b]">{topic.question}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#33493b]">{topic.answer}</p>
                </div>
                <div className="rounded-2xl bg-[#f8f6ee] p-5">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8a7d4c]">For example</p>
                  <p className="mt-2 text-sm leading-6 text-[#4f4a35]">{topic.example}</p>
                </div>
              </div>
              <details className="group border-t border-[#e6ede6] bg-[#f8faf7]">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-6 text-sm font-bold text-[#216146] sm:px-8">
                  See the details and articles
                  <span className="transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                </summary>
                <ul className="grid gap-3 px-6 pb-6 sm:grid-cols-2 sm:px-8">
                  {topic.points.map((point) => (
                    <li key={point.label} className="rounded-2xl border border-[#e3ebe3] bg-white p-4">
                      <p className="font-semibold text-[#19372d]">{point.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[#4f6455]">{point.detail}</p>
                      <p className="mt-2 text-xs font-bold text-[#4c8063]">{point.articles}</p>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#d9e3da] py-12" aria-labelledby="bill-heading">
        <SectionHeading index="03 / Step by step" id="bill-heading" title="How a bill becomes law" text="Press play, or tap any step. Switch to a money bill to see how budgets and taxes pass." />
        <BillToLaw />
      </section>

      <footer className="rounded-[24px] bg-[#173a34] px-6 py-7 text-sm leading-6 text-[#d7e8dc] sm:px-8">
        <p className="font-semibold text-white">These are simple summaries, not legal advice.</p>
        <p className="mt-1">
          The official text is the final word. Read it at{" "}
          <a href={constitutionSource.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#9fd5b3] underline underline-offset-4">{constitutionSource.title} ↗</a>. {constitutionReviewNote}
        </p>
      </footer>
    </div>
  );
}
