"use client";

import { useRef, useState } from "react";

import { CONSTITUTION_TEXT, EVERYDAY_ISSUES_CHECKED_ON, everydayIssues, type Level } from "@/records/everyday-issues";

const levels: { id: Level; name: string; body: string }[] = [
  { id: "union", name: "Union", body: "Parliament and the central government" },
  { id: "state", name: "State", body: "The state assembly and government" },
  { id: "local", name: "Local", body: "Panchayat or municipality" },
];

const groups = [...new Set(everydayIssues.map((issue) => issue.group))];
const checkedOn = new Date(`${EVERYDAY_ISSUES_CHECKED_ON}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Pick an everyday problem to see which level of government handles it, which office does the work,
// whom to ask, a national help channel, and the line of the Constitution behind it.
export default function WhoDoesWhat() {
  const [selected, setSelected] = useState(everydayIssues.findIndex((issue) => issue.id === "local-roads"));
  const issue = everydayIssues[selected];
  const answer = useRef<HTMLDivElement>(null);
  // On a phone the answer sits below thirty buttons, so a tap brings it into view.
  function choose(index: number) {
    setSelected(index);
    if (window.matchMedia("(max-width: 639px)").matches) {
      setTimeout(() => answer.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 0);
    }
  }

  return (
    <div className="rounded-[24px] border border-line bg-white p-5 sm:p-8">
      <p className="text-sm font-bold text-ink">Pick an everyday problem</p>
      <div className="mt-3 grid gap-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-subtle">{group}</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={group}>
              {everydayIssues.map((item, index) => item.group !== group ? null : (
                <button key={item.id} type="button" onClick={() => choose(index)} aria-pressed={index === selected}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition sm:px-3.5 sm:py-2 sm:text-sm ${index === selected ? "border-brand bg-brand text-white" : "border-line bg-surface-soft text-body hover:border-line-strong"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div key={issue.id} ref={answer} className="mt-8 scroll-mt-24 animate-[fadeUp_.35s_ease-out] motion-reduce:animate-none" aria-live="polite">
        <h3 className="text-2xl font-semibold tracking-[-0.025em] text-ink">{issue.label}</h3>
        <p className="mt-1 max-w-2xl text-[15px] leading-7 text-body">{issue.note}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {levels.map((level) => {
            const active = issue.levels.includes(level.id);
            return (
              <div key={level.id} className={`rounded-2xl border-2 p-4 transition-[transform,opacity,border-color,background-color] duration-300 motion-reduce:transition-none ${active ? "-translate-y-0.5 border-brand bg-tint" : "border-line-soft bg-surface-soft opacity-60"}`}>
                <p className="flex items-center justify-between text-xs font-extrabold uppercase tracking-[0.14em] text-eyebrow">
                  {level.name}{active ? <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] tracking-normal text-white">Handles it</span> : null}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">{level.body}</p>
              </div>
            );
          })}
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Who does the work</dt>
            <dd className="mt-1 text-[15px] leading-6 text-ink">{issue.office}</dd>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Who to ask if it is not fixed</dt>
            <dd className="mt-1 text-[15px] leading-6 text-ink">{issue.ask}</dd>
          </div>
          {issue.channel && (
            <div className="rounded-2xl bg-ink p-4 text-white sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-pop">Get help</dt>
              <dd className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {issue.channel.number && (
                  <a href={`tel:${issue.channel.number.replace(/\s/g, "")}`} className="font-display text-3xl font-bold tracking-[-0.02em] text-white hover:text-pop">{issue.channel.number}</a>
                )}
                <a href={issue.channel.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">{issue.channel.label} ↗</a>
                {issue.channel.source && (
                  <a href={issue.channel.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-white/60 underline underline-offset-2">Number confirmed by {issue.channel.source.title}</a>
                )}
              </dd>
            </div>
          )}
        </dl>

        {issue.basis.length > 0 && (
          <div className="mt-4 text-sm leading-6 text-muted">
            <span className="font-semibold text-body">In the Constitution: </span>
            {issue.basis.map((basis, index) => (
              <span key={`${basis.where}-${basis.entry}`}>
                {index ? "; " : ""}{basis.where === "Article" ? `Article ${basis.entry}` : `${basis.where}, entry ${basis.entry}`} (&ldquo;{basis.text}&rdquo;)
              </span>
            ))}.
          </div>
        )}
      </div>

      <p className="mt-6 border-t border-line-soft pt-4 text-xs leading-5 text-subtle">
        Article 246 and the Seventh Schedule split subjects between the Union and the states; Articles 243G and 243W let states hand local subjects to panchayats and municipalities, so the exact office varies by state.
        Checked {checkedOn} against <a href={CONSTITUTION_TEXT.url} target="_blank" rel="noopener noreferrer" className="underline">{CONSTITUTION_TEXT.title}</a> and each helpline&apos;s official site.
      </p>
    </div>
  );
}
