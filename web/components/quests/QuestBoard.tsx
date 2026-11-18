"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { doneCount, loadProgress, QUEST_EVENT, QUESTS, type QuestProgress } from "@/lib/quests";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function QuestBoard() {
  const [progress, setProgress] = useState<QuestProgress | null>(null);
  useEffect(() => {
    const update = () => setProgress(loadProgress());
    update();
    window.addEventListener(QUEST_EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(QUEST_EVENT, update); window.removeEventListener("storage", update); };
  }, []);
  const done = progress ? doneCount(progress) : 0;
  const card = progress?.["know-your-reps"]?.detail;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold text-ink" aria-live="polite">{progress ? `${done} of ${QUESTS.length} done` : "Loading your progress…"}</p>
        <div className="mt-2 flex h-2.5 max-w-md gap-1" aria-hidden="true">
          {QUESTS.map((quest) => <span key={quest.id} className={`flex-1 rounded-full ${progress?.[quest.id] ? "bg-you" : "bg-track"}`} />)}
        </div>
      </div>
      <ol className="grid gap-3">
        {QUESTS.map((quest, index) => {
          const entry = progress?.[quest.id];
          return (
            <li key={quest.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-[20px] border p-5 ${entry ? "border-you bg-you-soft" : "border-line bg-surface"}`}>
              <div className="flex min-w-0 gap-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${entry ? "bg-you text-white" : "bg-track text-body"}`} aria-hidden="true">{entry ? "✓" : index + 1}</span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink">{quest.title}</h2>
                  <p className="text-sm text-body">{quest.why}</p>
                  {entry ? <p className="mt-1 text-xs text-muted">Done on {day(entry.at)}</p> : null}
                </div>
              </div>
              {!entry ? <Link href={quest.start.href} className="inline-flex min-h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-bold text-link hover:bg-tint">{quest.start.label}</Link> : null}
            </li>
          );
        })}
      </ol>
      {card ? (
        <p className="rounded-[20px] border border-line bg-surface p-5 text-sm text-body">
          You know who represents you. <Link href={card} className="font-semibold text-link underline">Share your card</Link> so a friend looks up theirs.
        </p>
      ) : null}
      <p className="text-xs leading-5 text-muted">Your progress is saved only in this browser. Vote Better does not see it, and quests never score or rank any politician.</p>
    </div>
  );
}
