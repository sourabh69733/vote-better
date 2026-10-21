import Link from "next/link";
import type { ReactNode } from "react";
import { candidateHref, formatShort, seatHref, type Candidate, type Seat } from "@/lib/lok-sabha-2024";
import SourceChip, { type ChipSource } from "./SourceChip";

export function initials(name: string) {
  const parts = name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

export function Tile({ label, value, source, pending }: { label: string; value: string; source?: ChipSource; pending?: string }) {
  return (
    <div className={`min-w-0 rounded-2xl p-3 sm:p-4 ${pending ? "border border-dashed border-[#d5e0d5]" : "bg-[#f3f7f2]"}`}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7a8c7e]">{label}</p>
      <p className={`mt-1 line-clamp-2 font-semibold tracking-[-0.02em] ${value.length > 14 ? "text-base leading-6" : "text-xl"} ${pending ? "text-[#a3b3a6]" : "text-[#19372d]"}`} title={value}>{value}</p>
      {pending ? <p className="mt-0.5 text-xs leading-4 text-[#8a9b8e]">{pending}</p> : source && <div className="mt-2"><SourceChip source={source} /></div>}
    </div>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-7">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">{title}</h2>
      <div className="mt-3 text-[15px] leading-7 text-[#43594a]">{children}</div>
    </section>
  );
}

export function FactList({ facts }: { facts: [string, string][] }) {
  return (
    <dl className="grid gap-2">
      {facts.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-[#eef3ed] pb-2 text-sm last:border-0">
          <dt className="shrink-0 text-[#66796d]">{label}</dt>
          <dd className="text-right font-semibold text-[#19372d]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProfileHeader({ eyebrow, name, subtitle, status, summary, children }: {
  eyebrow: string; name: string; subtitle: string;
  status: { label: string; tone: "won" | "lost" | "sitting" }; summary: string; children?: ReactNode;
}) {
  const tone = status.tone === "lost" ? "bg-[#f6efdc] text-[#7a5d1c]" : "bg-[#1c6047] text-white";
  return (
    <header className="mt-6 rounded-[28px] border border-[#dce6dc] bg-white p-5 shadow-[0_12px_36px_rgba(28,64,40,.05)] sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e3f0e5] text-lg font-bold text-[#1c6047] sm:h-16 sm:w-16" aria-hidden="true">{initials(name)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#4c8063]">{eyebrow}</p>
          <h1 className="mt-1 text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.05em] text-[#19372d]">{name}</h1>
          <p className="mt-1 text-[#4f6455]">{subtitle}</p>
        </div>
        <span className={`hidden shrink-0 rounded-full px-3 py-1 text-sm font-bold sm:inline-flex ${tone}`}>{status.label}</span>
      </div>
      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold sm:hidden ${tone}`}>{status.label}</span>
      <p className="mt-5 rounded-2xl bg-[#f3f7f2] p-4 text-[16px] leading-7 text-[#2c4436]">{summary}</p>
      {children}
    </header>
  );
}

// The seat's result with this person highlighted.
export function SeatResultBars({ seat, highlight, compareWith }: { seat: Seat; highlight?: Candidate; compareWith?: Candidate }) {
  const shown = seat.candidates.slice(0, Math.max(5, highlight?.rank ?? 0));
  return (
    <>
      <ol className="mt-4 grid gap-3">
        {shown.map((other) => {
          const self = other.slug === highlight?.slug;
          return (
            <li key={other.slug}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <Link href={candidateHref(seat, other)} className={self ? "font-bold text-[#19372d] hover:underline" : "text-[#2c4f3a] hover:underline"}>
                  {other.rank}. {other.name} <span className="font-normal text-[#5f7465]">({other.party})</span>
                </Link>
                <span className="shrink-0 tabular-nums text-[#5f7465]">{formatShort(other.votes)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-[#eef3ed]" aria-hidden="true">
                <div className={`h-full rounded-full ${self ? "bg-[#1c6047]" : "bg-[#c8dccc]"}`} style={{ width: `${Math.max(other.shareOfValidVotes, 0.5)}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
        <Link href={seatHref(seat)} className="text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Full {seat.name} result</Link>
        {highlight && compareWith && (
          <Link href={`${seatHref(seat)}/compare?a=${highlight.slug}&b=${compareWith.slug}`} className="text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Compare with {compareWith.name}</Link>
        )}
      </div>
    </>
  );
}

export interface TimelineItem { when: string; text: string; source?: ChipSource; strong?: boolean }

export function Timeline({ items, gap }: { items: TimelineItem[]; gap?: string }) {
  return (
    <ol className="border-l-2 border-[#dce6dc] pl-5">
      {items.map((item, index) => (
        <li key={`${item.when}-${index}`} className={`relative ${index ? "mt-5" : ""}`}>
          <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ${item.strong ? "bg-[#1c6047]" : "bg-[#9ec9a8]"}`} aria-hidden="true" />
          <p className="text-sm font-bold text-[#4c8063]">{item.when}</p>
          <p>{item.text}</p>
          {item.source && <div className="mt-1"><SourceChip source={item.source} /></div>}
        </li>
      ))}
      {gap && (
        <li className="relative mt-5">
          <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-dashed border-[#c5d4c7] bg-white" aria-hidden="true" />
          <p className="text-sm text-[#8a9b8e]">{gap}</p>
        </li>
      )}
    </ol>
  );
}
