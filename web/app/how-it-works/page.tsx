import type { Metadata } from "next";
import Link from "next/link";

import { PROCESSES_CHECKED_ON, processes } from "@/records/processes";

export const metadata: Metadata = {
  title: "How it works: getting things done, step by step | Vote Better",
  description: "What happens after you file a police complaint, an RTI request, a voter form, a consumer complaint or a government grievance, and how an MP's fund work gets built. Each step from the law.",
};

const checkedOn = new Date(`${PROCESSES_CHECKED_ON}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Every common request, end to end: who acts at each step, the time limit the law sets, and the line of
// the law behind it. Plain HTML, so it works without JavaScript and every step can be linked to.
export default function HowItWorks() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eyebrow">How it works</p>
        <h1 className="mt-3 text-[clamp(2.4rem,5.5vw,4.2rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink">
          How things get done, <span className="relative whitespace-nowrap">step by step<span className="absolute inset-x-0 bottom-[0.08em] -z-10 h-[0.3em] rounded-sm bg-pop" aria-hidden="true" /></span>.
        </h1>
        <p className="mt-5 text-[17px] leading-8 text-body">
          What happens after you ask the government for something: who acts next, how long they have, and where to go if they don&apos;t. Every step comes from the law or official rules, linked to the exact page.
        </p>
      </header>

      <nav aria-label="Processes" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {processes.map((process, index) => (
          <a key={process.id} href={`#${process.id}`} className="group flex items-start gap-4 rounded-[20px] border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-line-strong">
            <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-lg font-bold text-pop">{index + 1}</span>
            <span>
              <span className="block font-semibold leading-snug text-ink group-hover:underline">{process.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{process.tagline} · {process.steps.length} steps</span>
            </span>
          </a>
        ))}
      </nav>

      <div className="mt-14 grid gap-14">
        {processes.map((process) => (
          <section key={process.id} id={process.id} aria-labelledby={`${process.id}-title`} className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div>
                <h2 id={`${process.id}-title`} className="text-3xl font-semibold tracking-[-0.03em] text-ink">{process.title}</h2>
                <p className="mt-1 text-body">{process.tagline}</p>
              </div>
              <a href={process.start.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-3 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:-translate-y-0.5">
                <span className="text-pop">Start</span>
                {process.start.number ? <span className="font-display text-lg">{process.start.number}</span> : null}
                <span className="font-semibold text-white/85">{process.start.label} ↗</span>
              </a>
            </div>

            <ol className="mt-6 grid gap-0">
              {process.steps.map((step, index) => {
                const last = index === process.steps.length - 1;
                return (
                  <li key={step.title} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
                    <div className="relative flex justify-center" aria-hidden="true">
                      <span className={`font-display relative z-10 mt-1 grid h-10 w-10 place-items-center rounded-full border-2 text-base font-bold ${step.who === "You" ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-ink"}`}>{index + 1}</span>
                      {!last && <span className="absolute bottom-0 top-11 w-0.5 bg-line" />}
                    </div>
                    <div className={last ? "pb-1" : "pb-7"}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${step.who === "You" ? "bg-tint text-brand" : "bg-track text-body"}`}>{step.who}</span>
                        {step.time && <span className="rounded-full bg-pop px-2.5 py-0.5 text-[11px] font-bold text-ink">⏱ {step.time}</span>}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold tracking-[-0.015em] text-ink">{step.title}</h3>
                      <p className="mt-1 max-w-2xl text-[15px] leading-7 text-body">{step.detail}</p>
                      <a href={step.ref.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-xs font-semibold text-link underline decoration-line-strong underline-offset-4 hover:decoration-link">{step.ref.label} ↗</a>
                    </div>
                  </li>
                );
              })}
            </ol>

            {(process.note || process.see) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-surface-soft px-5 py-4 text-sm text-body">
                {process.note && (
                  <p>
                    {process.note}
                    {process.noteRef && <> <a href={process.noteRef.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-link underline underline-offset-4">{process.noteRef.label} ↗</a></>}
                  </p>
                )}
                {process.see && <Link href={process.see.href} className="font-semibold text-link underline underline-offset-4">{process.see.label} →</Link>}
              </div>
            )}
          </section>
        ))}
      </div>

      <p className="mt-14 max-w-3xl border-t border-line pt-6 text-xs leading-5 text-subtle">
        Checked {checkedOn} against each linked document. This explains the general process, not your case: states can add their own rules, and the law or an official&apos;s order decides an individual situation. Not legal advice.
      </p>
    </div>
  );
}
