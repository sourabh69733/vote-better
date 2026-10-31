import { CandidateResultList } from "./CandidateResultList";
import { getAreaElectionResult } from "@/lib/publication";

export function ElectionResult({ areaId }: { areaId: string }) {
  const candidates = getAreaElectionResult(areaId);
  if (!candidates) return null;
  const year = candidates[0].resultDate?.slice(0, 4);

  return (
    <section className="rounded-[22px] border border-[#dce6dc] bg-white p-6 shadow-[0_12px_36px_rgba(28,64,40,.05)] sm:p-8" aria-labelledby="election-result-heading">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#528166]">Election</p>
      <h2 id="election-result-heading" className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#19372d]">{year ? `${year} election result` : "Election result"}</h2>
      <p className="mt-2 text-sm leading-6 text-[#617466]">Candidate votes from the reviewed official return. Select Source to see the document, row and review dates.</p>
      <CandidateResultList candidates={candidates} />
    </section>
  );
}
