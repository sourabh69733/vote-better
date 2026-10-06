import Link from "next/link";

import { getAreaElectionResult, type WebPublication } from "@/lib/publication";

type Candidate = WebPublication["dataset"]["candidacies"][number];

function CandidateRow({ candidate, rank }: { candidate: Candidate; rank: number }) {
  return (
    <li className="grid gap-3 border-b border-[#e4ebe4] py-4 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="text-xs font-bold text-[#839185]">{String(rank).padStart(2, "0")}</span>
      <div className="min-w-0">
        <p className="font-semibold text-[#19372d]">{candidate.name}</p>
        <p className="mt-1 text-sm text-[#66786a]">{candidate.party}</p>
      </div>
      <div className="flex items-center gap-4 sm:justify-end">
        <strong className="text-lg tabular-nums text-[#19372d]">{candidate.votes.toLocaleString("en-IN")}</strong>
        <Link href={`/facts/${candidate.factIds[2]}`} aria-label={`Source for ${candidate.name} votes`} className="text-sm font-semibold text-[#216b4b] underline underline-offset-4">Source</Link>
      </div>
    </li>
  );
}

export function ElectionResult({ areaId }: { areaId: string }) {
  const candidates = getAreaElectionResult(areaId);
  if (!candidates) return null;
  const year = candidates[0].resultDate?.slice(0, 4);

  return (
    <section className="rounded-[22px] border border-[#dce6dc] bg-white p-6 shadow-[0_12px_36px_rgba(28,64,40,.05)] sm:p-8" aria-labelledby="election-result-heading">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#528166]">Election</p>
      <h2 id="election-result-heading" className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#19372d]">{year ? `${year} election result` : "Election result"}</h2>
      <p className="mt-2 text-sm leading-6 text-[#617466]">Candidate votes from the reviewed official return. Select Source to see the document, row and review dates.</p>
      <ol className="mt-5">
        {candidates.slice(0, 2).map((candidate, index) =>
          <CandidateRow key={candidate.personId} candidate={candidate} rank={index + 1} />)}
      </ol>
      {candidates.length > 2 && <details className="mt-4 border-t border-[#e4ebe4] pt-4">
        <summary className="cursor-pointer text-sm font-bold text-[#216b4b]">Show all {candidates.length} candidates</summary>
        <ol className="mt-3">
          {candidates.slice(2).map((candidate, index) =>
            <CandidateRow key={candidate.personId} candidate={candidate} rank={index + 3} />)}
        </ol>
      </details>}
    </section>
  );
}
