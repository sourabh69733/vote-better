"use client";

import Link from "next/link";
import { useId, useState } from "react";

import type { WebPublication } from "@/lib/publication";

type Candidate = WebPublication["dataset"]["candidacies"][number];

export function CandidateResultList({ candidates }: { candidates: Candidate[] }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const visible = expanded ? candidates : candidates.slice(0, 1);

  return (
    <>
      <ol id={listId} className="mt-5">
        {visible.map((candidate, index) => (
          <li key={candidate.personId} className="grid gap-3 border-b border-[#e4ebe4] py-4 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
            <span className="text-xs font-bold text-[#839185]">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <Link href={`/people/${candidate.personId}`} className="font-semibold text-[#19372d] underline decoration-[#b8cfc1] underline-offset-4 hover:text-[#216b4b]">{candidate.name}</Link>
              <p className="mt-1 text-sm text-[#66786a]">{candidate.party}</p>
            </div>
            <div className="flex items-center gap-4 sm:justify-end">
              <strong className="text-lg tabular-nums text-[#19372d]">{candidate.votes.toLocaleString("en-IN")}</strong>
              <Link href={`/facts/${candidate.factIds[2]}`} aria-label={`Source for ${candidate.name} votes`} className="text-sm font-semibold text-[#216b4b] underline underline-offset-4">Source</Link>
            </div>
          </li>
        ))}
      </ol>
      {candidates.length > 2 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 border-t border-[#e4ebe4] pt-4 text-sm font-bold text-[#216b4b] hover:text-[#154b36]"
        >
          <span aria-hidden="true">{expanded ? "▲" : "▼"}</span>
          {expanded ? "Hide other candidates" : `View ${candidates.length - 1} other candidates`}
        </button>
      )}
    </>
  );
}
