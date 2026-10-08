"use client";

import { useState } from "react";
import type { ParliamentaryQuestion } from "@/lib/parliamentary-work";

function topQuestionMinistries(questions: ParliamentaryQuestion[]) {
  const counts = new Map<string, number>();
  for (const question of questions) counts.set(question.ministry, (counts.get(question.ministry) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4);
}

interface Props {
  work: {
    lokSabha: number;
    session: number;
    collectedOn: string;
    directoryUrl: string;
    questions: ParliamentaryQuestion[];
  };
}

export function ParliamentQuestions({ work }: Props) {
  const [expanded, setExpanded] = useState(false);
  const starred = work.questions.filter((question) => question.type === "STARRED").length;
  return <div className="rounded-2xl border border-[#c8dfce] bg-[#f4faf4] p-5 sm:p-6">
    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#35684b]">{work.lokSabha}th Lok Sabha · Session {work.session}</p>
    <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
      <strong className="text-5xl font-semibold tabular-nums tracking-[-0.06em] text-[#19372d]">{work.questions.length}</strong>
      <p className="max-w-sm pb-1 text-sm leading-6 text-[#405b49]">questions listing this MP in the complete Session {work.session} feed</p>
    </div>
    <p className="mt-2 text-sm leading-6 text-[#4d6354]">{starred} starred, {work.questions.length - starred} unstarred. Jointly listed questions are included. This is a session count, not a lifetime total.</p>
    <p className="mt-3 text-xs text-[#526b58]">Official Digital Sansad feed collected {work.collectedOn}. <a href={work.directoryUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline underline-offset-4">Search the official question list ↗</a></p>

    {work.questions.length > 0 && <>
      <div className="mt-5 border-t border-[#d6e7d9] pt-4">
        <h3 className="text-sm font-bold text-[#19372d]">Most frequent ministries in these questions</h3>
        <ul className="mt-3 flex flex-wrap gap-2">{topQuestionMinistries(work.questions).map(([ministry, count]) => <li key={ministry} className="rounded-full border border-[#d4e4d5] bg-white px-3 py-2 text-xs font-semibold text-[#284d38]">{ministry} · {count}</li>)}</ul>
      </div>
      <div className="mt-6 border-t border-[#d6e7d9] pt-4">
        {!expanded && <button type="button" aria-expanded={false} onClick={() => setExpanded(true)} className="min-h-11 font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">See all {work.questions.length} questions</button>}
        {expanded && <ol className="grid gap-3">{work.questions.map((question) => <li key={question.id} className="rounded-xl border border-[#dce8dd] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#587061]">{question.date} · {question.type.toLowerCase()} question {question.number}</p>
          <h4 className="mt-1 font-semibold leading-6 text-[#19372d]">{question.subject}</h4>
          <p className="mt-1 text-sm text-[#526558]">{question.ministry}{question.listedMembers.length > 1 ? ` · listed with ${question.listedMembers.length - 1} other MP${question.listedMembers.length > 2 ? "s" : ""}` : ""}</p>
          <a href={question.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">Read official question and answer ↗</a>
        </li>)}</ol>}
        {expanded && <button type="button" aria-expanded={true} onClick={() => setExpanded(false)} className="mt-4 min-h-11 font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">Show fewer questions ↑</button>}
      </div>
    </>}
    <p className="mt-5 text-xs leading-5 text-[#526b58]">Outcomes are not assessed here. A question or ministry answer does not establish that a local project was completed.</p>
  </div>;
}
