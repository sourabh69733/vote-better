"use client";

import { useState } from "react";
import type { getParliamentaryWork, ParliamentaryQuestion } from "@/lib/parliamentary-work";

type Work = NonNullable<ReturnType<typeof getParliamentaryWork>>;

function topQuestionMinistries(questions: ParliamentaryQuestion[]) {
  const counts = new Map<string, number>();
  for (const question of questions) if (question.ministry) counts.set(question.ministry, (counts.get(question.ministry) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4);
}

export function ParliamentQuestions({ work }: { work: Work }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const questions = selectedSession === null ? work.questions : work.questions.filter((question) => question.session === selectedSession);
  const starred = work.questions.filter((question) => question.type === "STARRED").length;
  const maxCount = Math.max(1, ...work.sessions.map((session) => session.count));
  const firstSession = work.sessions[0].session;
  const lastSession = work.sessions.at(-1)!.session;

  return <div className="rounded-2xl border border-[#c8dfce] bg-[#f4faf4] p-5 sm:p-6">
    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#35684b]">{work.lokSabha}th Lok Sabha · Sessions {firstSession}-{lastSession}</p>
    <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
      <strong className="text-5xl font-semibold tabular-nums tracking-[-0.06em] text-[#19372d]">{work.questions.length}</strong>
      <p className="max-w-sm pb-1 text-sm leading-6 text-[#405b49]">questions listing this MP across {work.sessions.length} complete session feeds</p>
    </div>
    <p className="mt-2 text-sm leading-6 text-[#4d6354]">{starred} starred, {work.questions.length - starred} unstarred. Jointly listed questions are included. This is a count of these sessions, not proof of impact.</p>
    <p className="mt-3 text-xs text-[#526b58]">Official Digital Sansad feeds collected through {work.collectedOn}. <a href={work.directoryUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline underline-offset-4">Search the official question list ↗</a></p>

    <div className="mt-5 border-t border-[#d6e7d9] pt-4">
      <h3 className="text-sm font-bold text-[#19372d]">Questions by session</h3>
      <p className="mt-1 text-xs leading-5 text-[#526b58]">Select a session to inspect its listed questions. A zero means the complete feed lists none for this MP.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {work.sessions.map((session) => <button key={session.session} type="button" onClick={() => { setSelectedSession(session.session); setExpanded(true); }} aria-pressed={selectedSession === session.session} className="rounded-xl border border-[#d4e4d5] bg-white px-3 py-3 text-left transition-colors hover:bg-[#ecf6ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 aria-pressed:border-[#327452]">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[#284d38]"><span>Session {session.session}</span><span className="tabular-nums">{session.count}</span></span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#e5efe6]"><span className="block h-full rounded-full bg-[#3a8056]" style={{ width: `${100 * session.count / maxCount}%` }} /></span>
          <span className="mt-1 block text-[11px] text-[#62776a]">Collected {session.collectedOn}</span>
        </button>)}
      </div>
    </div>

    {work.questions.length > 0 && <div className="mt-5 border-t border-[#d6e7d9] pt-4">
      <h3 className="text-sm font-bold text-[#19372d]">Most frequent ministries in these questions</h3>
      <ul className="mt-3 flex flex-wrap gap-2">{topQuestionMinistries(work.questions).map(([ministry, count]) => <li key={ministry} className="rounded-full border border-[#d4e4d5] bg-white px-3 py-2 text-xs font-semibold text-[#284d38]">{ministry} · {count}</li>)}</ul>
    </div>}

    <div className="mt-6 border-t border-[#d6e7d9] pt-4">
      {selectedSession !== null && <button type="button" onClick={() => setSelectedSession(null)} className="mb-3 block min-h-11 text-sm font-semibold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">Show all sessions</button>}
      {!expanded && work.questions.length > 0 && <button type="button" aria-expanded={false} onClick={() => setExpanded(true)} className="min-h-11 font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">{selectedSession === null ? `See all ${work.questions.length} questions` : `See Session ${selectedSession} questions`}</button>}
      {expanded && questions.length === 0 && <p className="text-sm text-[#526558]">No questions list this MP in Session {selectedSession}.</p>}
      {expanded && questions.length > 0 && <ol className="grid gap-3">{questions.map((question) => <li key={question.id} className="rounded-xl border border-[#dce8dd] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#587061]">Session {question.session} · {question.date} · {question.type.toLowerCase()} question {question.number}</p>
        <h4 className="mt-1 font-semibold leading-6 text-[#19372d]">{question.subject}</h4>
        <p className="mt-1 text-sm text-[#526558]">{question.ministry}{question.listedMembers.length > 1 ? ` · listed with ${question.listedMembers.length - 1} other MP${question.listedMembers.length > 2 ? "s" : ""}` : ""}</p>
        <a href={question.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">Read official question and answer ↗</a>
      </li>)}</ol>}
      {expanded && <button type="button" aria-expanded={true} onClick={() => { setExpanded(false); setSelectedSession(null); }} className="mt-4 min-h-11 font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-emerald-800">Show fewer questions ↑</button>}
    </div>
    <details className="mt-5 border-t border-[#d6e7d9] pt-4 text-xs leading-5 text-[#526b58]">
      <summary className="min-h-11 cursor-pointer font-semibold text-emerald-800">How these counts were built</summary>
      <p className="mt-2">For each session, the importer checked the official feed total, the MP&apos;s exact directory identity, and every saved page hash. The links below are technical feed pages; the official question list and each question PDF are easier to read.</p>
      <ul className="mt-3 grid gap-3">{work.sessions.map((session) => <li key={session.session} className="rounded-lg bg-white p-3">
        <p className="font-semibold text-[#284d38]">Session {session.session}: {session.totalSessionQuestions.toLocaleString("en-IN")} feed records · collected {session.collectedOn}</p>
        <ul className="mt-2 grid gap-1">{session.sourcePages.map((page, index) => <li key={page.sha256} className="break-all"><a href={page.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline underline-offset-4">Page {index + 1}</a> · {page.count} records · SHA-256 {page.sha256}</li>)}</ul>
      </li>)}</ul>
    </details>
    <p className="mt-5 text-xs leading-5 text-[#526b58]">Outcomes are not assessed here. A question or ministry answer does not establish that a local project was completed.</p>
  </div>;
}
