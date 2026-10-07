"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { searchQuestions, type ConstitutionQuestion } from "@/lib/constitution";

const suggestions = ["What are my protest rights?", "What are my rights if I am arrested?", "Who fixes roads in my area?", "Can I criticise the government?", "At what age can I vote?"];

export default function AskQuestion({ questions }: { questions: ConstitutionQuestion[] }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchQuestions(questions, query), [questions, query]);
  const [best, ...related] = matches;
  const searched = query.trim().length > 2;

  return (
    <div className="rounded-[24px] border border-[#dce6dc] bg-white p-5 shadow-[0_12px_36px_rgba(28,64,40,.07)] sm:p-6">
      <label htmlFor="constitution-question" className="text-sm font-bold text-[#19372d]">Ask a question</label>
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#cfdccf] bg-[#fbfcfa] px-4 focus-within:border-[#2a7658] focus-within:ring-4 focus-within:ring-[#2a7658]/10">
        <span aria-hidden="true" className="text-[#7b9182]">⌕</span>
        <input
          id="constitution-question"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Can police arrest me without a reason?"
          autoComplete="off"
          className="min-h-12 w-full bg-transparent text-base outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-sm font-semibold text-[#6d8273] hover:text-[#19372d]" aria-label="Clear question">✕</button>
        )}
      </div>

      {!searched && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => setQuery(suggestion)} className="rounded-full border border-[#d5e3d7] bg-[#f3f8f3] px-3 py-1.5 text-left text-xs font-semibold text-[#2c6249] hover:bg-[#e3f0e5]">
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {searched && best && (
          <div className="mt-5">
            <article className="rounded-2xl bg-[#eff7ef] p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#4c8063]">{best.articles}</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#18372b]">{best.question}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#33493b]">{best.answer}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {best.guideId && (
                  <Link href={`/constitution/${best.guideId}`} className="text-sm font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Read the full guide →</Link>
                )}
                <a href={`#${best.topicId}`} className="text-sm font-semibold text-[#4d6b57] underline decoration-[#c5d9ca] underline-offset-4">Related topic ↓</a>
              </div>
            </article>
            {related.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8c7e]">Related</p>
                <ul className="mt-2 grid gap-1">
                  {related.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => setQuery(item.question)} className="text-left text-sm font-semibold text-[#2c6249] hover:underline">{item.question}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {searched && !best && (
          <p className="mt-5 rounded-2xl bg-[#f8f6ee] p-4 text-sm leading-6 text-[#5d5a45]">
            No answer yet for this question. Try simpler words like &quot;arrest&quot;, &quot;vote&quot; or &quot;roads&quot;, or browse the topics below.
          </p>
        )}
      </div>
    </div>
  );
}
