"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Side { name: string; party: string; color: string; votes: number; label: string; href?: string }

// Winner against runner-up. The empty middle is the margin.
export function TugOfWar({ left, right, focus }: { left: Side; right: Side; focus: "left" | "right" }) {
  const total = left.votes + right.votes;
  const leftShare = (left.votes / total) * 100;
  const side = (item: Side, align: "left" | "right") => (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <p className={`truncate text-sm font-bold ${focus === align ? "text-[#122a20]" : "text-[#5f7465]"}`}>
        {item.href ? <Link href={item.href} className="hover:underline">{item.name}</Link> : item.name}
      </p>
      <p className="text-xs text-[#6b7f71]">{item.party} · {item.label}</p>
    </div>
  );
  return (
    <div>
      <div className="flex items-end justify-between gap-4">{side(left, "left")}{side(right, "right")}</div>
      <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-[#e8eee8]" role="img" aria-label={`${left.name} ${left.label}, ${right.name} ${right.label}`}>
        <div className="h-full origin-left rounded-l-full animate-[growX_.9s_ease-out] motion-reduce:animate-none" style={{ width: `${leftShare}%`, background: left.color }} />
        <div className="h-full flex-1 origin-right rounded-r-full animate-[growX_.9s_ease-out] motion-reduce:animate-none" style={{ background: right.color }} />
      </div>
    </div>
  );
}

export interface RaceRow { key: string; name: string; party: string; color: string; votes: number; share: number; href: string; self?: boolean; rank: number }

export function VoteRace({ rows, nota, initial = 5 }: { rows: RaceRow[]; nota?: number | null; initial?: number }) {
  const [all, setAll] = useState(false);
  const self = rows.find((row) => row.self);
  const shown = all ? rows : rows.filter((row, index) => index < initial || row.self);
  const max = rows[0]?.share ?? 100;
  return (
    <div>
      <ol className="grid gap-2.5">
        {shown.map((row) => (
          <li key={row.key}>
            <Link href={row.href} className={`group block rounded-xl px-3 py-2 ${row.self ? "bg-[#f1f6f1] ring-1 ring-[#cfe0d2]" : "hover:bg-[#f6f9f5]"}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`min-w-0 truncate ${row.self ? "font-bold text-[#122a20]" : "text-[#2c4436]"}`}>
                  <span className="mr-1.5 tabular-nums text-[#8a9b8e]">{row.rank}</span>{row.name} <span className="text-[#6b7f71]">· {row.party}</span>
                </span>
                <span className="shrink-0 tabular-nums text-[#4f6455]">{row.share.toFixed(1)}%</span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-[#edf2ec]">
                <div className="h-full origin-left rounded-full animate-[growX_.7s_ease-out] motion-reduce:animate-none" style={{ width: `${Math.max((row.share / max) * 100, 0.8)}%`, background: row.color, opacity: row.self || row.rank === 1 ? 1 : 0.55 }} />
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-3 text-sm">
        {rows.length > initial ? (
          <button type="button" onClick={() => setAll(!all)} className="font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">
            {all ? "Show fewer" : `Show all ${rows.length} candidates`}
          </button>
        ) : <span />}
        {nota !== undefined && nota !== null && <span className="text-[#6b7f71]">NOTA: {nota.toLocaleString("en-IN")} votes</span>}
      </div>
      {self && self.rank > initial && !all && <p className="sr-only">Highlighted candidate finished {self.rank}.</p>}
    </div>
  );
}

// Tap or hover a bar to read its value.
export function Bars({ data, color, unit }: { data: { label: string; count: number }[]; color: string; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.count), 1);
  const current = active ?? data.length - 1;
  return (
    <div>
      <p className="text-sm text-[#4f6455]"><span className="text-lg font-semibold text-[#122a20]">{data[current]?.count}</span> {unit} · {data[current]?.label}</p>
      <div className="mt-3 flex h-28 items-end gap-1.5">
        {data.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => setActive(index)}
            aria-label={`${item.label}: ${item.count} ${unit}`}
            className="group flex h-full flex-1 flex-col justify-end"
          >
            <span className="block w-full origin-bottom rounded-t-md animate-[growY_.7s_ease-out] transition-opacity motion-reduce:animate-none" style={{ height: `${Math.max((item.count / max) * 100, 3)}%`, background: color, opacity: index === current ? 1 : 0.45 }} />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-[10px] text-[#8a9b8e]">
        {data.map((item) => <span key={item.label} className="flex-1 truncate text-center">{item.label.replace("Session ", "S")}</span>)}
      </div>
    </div>
  );
}

// Sticky section menu that follows the reader's scroll position.
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-130px 0px -60% 0px" });
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);
  return (
    <nav aria-label="Profile sections" className="sticky top-[72px] z-20 -mx-4 overflow-x-auto bg-[#f5f7f2]/90 px-4 py-3 backdrop-blur [scrollbar-width:none] sm:mx-0 sm:rounded-full sm:px-2">
      <ul className="flex gap-1.5">
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} aria-current={active === section.id ? "true" : undefined}
              className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors ${active === section.id ? "bg-[#122a20] text-white" : "text-[#3c5a47] hover:bg-white"}`}>
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
