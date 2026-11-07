"use client";

import { useState } from "react";
import Link from "next/link";
import type { RightsTopic } from "@/lib/protest-guide";
import RightsCitation from "./RightsCitation";

const stages = [
  { id: "protesting", label: "Planning to attend", topic: "peaceful-protest" },
  { id: "stopped", label: "Stopped", topic: "dispersal" },
  { id: "questioned", label: "Called for questioning", topic: "questioning" },
  { id: "detained", label: "Detained or removed", topic: "preventive-action" },
  { id: "arrested", label: "Arrested", topic: "arrest-safeguards" },
  { id: "fir-registered", label: "FIR registered", topic: "fir-process" },
] as const;
type StageId = (typeof stages)[number]["id"];

export default function ProtestExplorer({ topics }: { topics: RightsTopic[] }) {
  const [selected, setSelected] = useState<StageId>("protesting");
  const stage = stages.find((item) => item.id === selected)!;
  const topic = topics.find((item) => item.id === stage.topic)!;
  function node(id: StageId, caption: string) {
    const item = stages.find((entry) => entry.id === id)!;
    return <button type="button" aria-pressed={selected === id} aria-controls="rights-explanation" onClick={() => setSelected(id)}
      className={"w-full cursor-pointer rounded-2xl border-2 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176447] " + (selected === id ? "border-[#206b4e] bg-[#e7f2e8]" : "border-[#d6e3d8] bg-white hover:border-[#99bca4]")}>
      <span className="block text-base font-bold text-[#204a36]">{item.label}</span>
      <span className="mt-1 block text-sm leading-6 text-[#516858]">{caption}</span>
      <span className="mt-3 block text-xs font-semibold text-[#176447]">{selected === id ? "Selected" : "Explore this situation"}</span>
    </button>;
  }
  const connector = (text: string) => <div className="flex min-h-14 items-center justify-center gap-2 px-2 py-2 text-center text-xs font-semibold leading-5 text-[#5e7666]"><span aria-hidden="true">↓</span>{text}</div>;

  return <section aria-labelledby="explorer-heading" className="rounded-[28px] border border-[#ceded0] bg-[#f8fbf7] p-5 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#397558]">Explore the legal routes</p>
        <h2 id="explorer-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#193b2f]">What changes in your situation?</h2></div>
      <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#536c5a]">Tap a node to read its explanation</span>
    </div>
    <p className="mt-3 max-w-3xl text-base leading-7 text-[#52685a]">These are possible legal routes. Each connection needs its own facts and legal basis; the diagram does not predict what police will do. Arrest or questioning can also happen before an FIR is recorded.</p>
    <RightsCitation ids={["bnss-35", "bnss-170", "bnss-179"]} />
    <div className="mt-7">
      <div className="mx-auto max-w-sm">{node("protesting", "Speech, peaceful assembly and movement")}</div>
      <div className="grid gap-4 pt-3 md:grid-cols-2 md:gap-8">
        <div>
          {connector("If a lawful direction or dispersal power applies")}
          {node("stopped", "Restrictions and police directions")}
          <RightsCitation ids={["bnss-148", "bnss-172"]} />
          {connector("Only if the applicable preventive power's conditions are met")}
          {node("detained", "Preventive action, removal or detention")}
          <RightsCitation ids={["bnss-170", "bnss-172", "delhi-police-65"]} />
        </div>
        <div>
          {connector("If information alleges a cognizable offence")}
          {node("fir-registered", "Recording an allegation is a separate process")}
          <RightsCitation ids={["bnss-173"]} />
          {connector("Notice or arrest must follow the applicable conditions")}
          <div className="grid gap-3 sm:grid-cols-2">
            {node("questioned", "Notice or witness attendance")}
            {node("arrested", "A separate lawful basis is required")}
          </div>
          <RightsCitation ids={["bnss-35", "bnss-179"]} />
        </div>
      </div>
    </div>
    <div id="rights-explanation" role="region" aria-labelledby="selected-situation" className="mt-6 rounded-2xl border border-[#cfdfd1] bg-white p-5 sm:p-7">
      <p role="status" aria-live="polite" className="text-xs font-bold uppercase tracking-[0.12em] text-[#397558]">{stage.label}</p>
      <h3 id="selected-situation" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#193b2f]">{topic.title}</h3>
      <p className="mt-3 max-w-[76ch] text-base leading-8 text-[#304b3c]">{topic.paragraphs[0].text}</p>
      <RightsCitation ids={topic.paragraphs[0].references} />
      <Link href={"/rights/" + selected} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#1d6248] px-5 text-sm font-bold text-white hover:bg-[#154d37] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176447]">Read this situation in detail <span aria-hidden="true" className="ml-2">→</span></Link>
    </div>
  </section>;
}
