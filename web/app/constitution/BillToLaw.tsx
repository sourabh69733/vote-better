"use client";

import { useEffect, useState } from "react";

type Step = { short: string; title: string; detail: string; articles: string };

const ordinarySteps: Step[] = [
  { short: "Draft", title: "A bill is written", detail: "A minister or any MP drafts a proposed law. An ordinary bill can start in either House.", articles: "Article 107" },
  { short: "Lok Sabha", title: "Lok Sabha debates and votes", detail: "Members discuss it, may send it to a committee, suggest changes, then vote. A majority of members present and voting passes it.", articles: "Articles 100 and 107" },
  { short: "Rajya Sabha", title: "Rajya Sabha does the same", detail: "It can pass, change or reject the bill. Both Houses must agree on the same text.", articles: "Article 107" },
  { short: "Disagree?", title: "If the Houses disagree", detail: "The President can call a joint sitting of both Houses. The majority of members present and voting decides.", articles: "Article 108" },
  { short: "President", title: "The President decides", detail: "The President signs it, or returns it once for reconsideration. If Parliament passes it again, the President must sign.", articles: "Article 111" },
  { short: "Law", title: "It becomes an Act", detail: "The signed bill is now law and is published in the Gazette of India.", articles: "Article 111" },
];

const moneySteps: Step[] = [
  { short: "Draft", title: "A money bill is written", detail: "It needs the President's recommendation and is usually brought by the Finance Minister. It deals only with taxes, borrowing or government spending.", articles: "Articles 110 and 117" },
  { short: "Lok Sabha", title: "It must start in the Lok Sabha", detail: "Money bills cannot be introduced in the Rajya Sabha. The Speaker certifies that it is a money bill.", articles: "Articles 109 and 110" },
  { short: "Rajya Sabha", title: "Rajya Sabha can only suggest", detail: "It has 14 days to recommend changes. The Lok Sabha may accept or ignore them. After 14 days the bill counts as passed.", articles: "Article 109" },
  { short: "President", title: "The President signs", detail: "The President cannot return a money bill for reconsideration.", articles: "Article 111" },
  { short: "Law", title: "It becomes an Act", detail: "Budgets and tax changes take effect this way.", articles: "Article 109" },
];

export default function BillToLaw() {
  const [money, setMoney] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const steps = money ? moneySteps : ordinarySteps;
  const step = steps[index];
  const last = steps.length - 1;
  const progress = (index / last) * 100;

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      const stop = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(stop);
    }
    const timer = setTimeout(() => setIndex((current) => current + 1), 2600);
    return () => clearTimeout(timer);
  }, [playing, index, last]);

  function switchMode(next: boolean) {
    setMoney(next);
    setIndex(0);
    setPlaying(false);
  }

  function play() {
    if (index >= last) setIndex(0);
    setPlaying(!playing);
  }

  return (
    <div className="rounded-[24px] border border-[#dce6dc] bg-white p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full bg-[#eef3ed] p-1 text-sm font-bold" role="group" aria-label="Type of bill">
          {[false, true].map((option) => (
            <button key={String(option)} type="button" onClick={() => switchMode(option)} aria-pressed={money === option} className={`rounded-full px-4 py-2 ${money === option ? "bg-white text-[#19372d] shadow-sm" : "text-[#64806c]"}`}>
              {option ? "Money bill" : "Ordinary bill"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setPlaying(false); setIndex(Math.max(0, index - 1)); }} disabled={index === 0} className="min-h-10 rounded-full border border-[#cfdccf] px-4 text-sm font-bold text-[#2c6249] disabled:opacity-40">← Back</button>
          <button type="button" onClick={play} className="min-h-10 rounded-full bg-[#1c6047] px-5 text-sm font-bold text-white hover:bg-[#154c38]">
            {playing ? "Pause" : index >= last ? "Replay" : "▶ Play"}
          </button>
          <button type="button" onClick={() => { setPlaying(false); setIndex(Math.min(last, index + 1)); }} disabled={index === last} className="min-h-10 rounded-full border border-[#cfdccf] px-4 text-sm font-bold text-[#2c6249] disabled:opacity-40">Next →</button>
        </div>
      </div>

      <div className="relative mt-10 px-3 sm:px-6">
        <div className="absolute left-3 right-3 top-5 h-1 rounded-full bg-[#e3ebe3] sm:left-6 sm:right-6" />
        <div className="absolute left-3 top-5 h-1 rounded-full bg-[#43896a] transition-[width] duration-700 ease-out motion-reduce:transition-none sm:left-6" style={{ width: `calc((100% - 3rem) * ${progress / 100})` }} />
        <div className="absolute top-0 z-10 -ml-5 grid h-11 w-10 place-items-center rounded-lg border-2 border-[#1c6047] bg-[#fffdf5] text-[10px] font-extrabold text-[#1c6047] shadow-md transition-[left] duration-700 ease-out motion-reduce:transition-none" style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${progress / 100})` }} aria-hidden="true">
          {index === last ? "ACT" : "BILL"}
        </div>
        <ol className="relative flex justify-between">
          {steps.map((item, i) => (
            <li key={item.short} className="flex w-0 flex-col items-center">
              <button type="button" onClick={() => { setPlaying(false); setIndex(i); }} aria-label={`Step ${i + 1}: ${item.title}`} aria-current={i === index ? "step" : undefined} className={`mt-[14px] h-4 w-4 rounded-full border-2 ${i <= index ? "border-[#1c6047] bg-[#43896a]" : "border-[#c5d4c7] bg-white"}`} />
              <span className={`mt-6 whitespace-nowrap text-[11px] font-bold sm:text-xs ${i === index ? "text-[#19372d]" : "hidden text-[#8a9b8e] sm:inline"}`}>{item.short}</span>
            </li>
          ))}
        </ol>
      </div>

      <div key={`${money}-${index}`} className="mt-8 rounded-2xl bg-[#f6faf5] p-5 animate-[fadeUp_.35s_ease-out] motion-reduce:animate-none sm:p-6" aria-live="polite">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#4c8063]">Step {index + 1} of {steps.length} · {step.articles}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#18372b]">{step.title}</h3>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#43594a]">{step.detail}</p>
      </div>
    </div>
  );
}
