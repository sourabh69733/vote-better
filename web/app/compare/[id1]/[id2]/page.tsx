import Link from "next/link";
import { getCandidateById, getAllCandidates } from "@/lib/data";
import HeadToHead from "@/components/HeadToHead";

interface PageProps {
  params: Promise<{ id1: string; id2: string }>;
}

export async function generateStaticParams() {
  const candidates = getAllCandidates().filter((c: { id: string }) => c?.id);
  const params: { id1: string; id2: string }[] = [];

  // Generate pairs for all candidates (limited to avoid combinatorial explosion)
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      params.push({ id1: candidates[i].id, id2: candidates[j].id });
    }
  }
  return params;
}

export default async function ComparePage({ params }: PageProps) {
  const { id1, id2 } = await params;
  const candidateA = getCandidateById(id1);
  const candidateB = getCandidateById(id2);

  if (!candidateA || !candidateB) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Candidate Not Found
        </h1>
        <p className="text-slate-600 mb-6">
          One or both candidates could not be loaded.
        </p>
        <Link href="/" className="text-indigo-600 hover:underline">
          ← Go Home
        </Link>
      </div>
    );
  }

  // Get all candidates for the selector
  const allCandidates = getAllCandidates().filter(
    (c: { id: string }) => c?.id
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
        ⚔️ Head-to-Head Clash
      </h1>
      <p className="text-sm text-slate-500 text-center mb-6">
        Compare two candidates side by side on key metrics
      </p>

      <HeadToHead candidateA={candidateA} candidateB={candidateB} />

      {/* Swap / Change candidates */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/compare/${id2}/${id1}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-100 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          🔄 Swap Sides
        </Link>
        <Link
          href={`/candidate/${id1}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-100 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          📄 Full Profile: {candidateA.name}
        </Link>
        <Link
          href={`/candidate/${id2}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-100 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          📄 Full Profile: {candidateB.name}
        </Link>
      </div>

      {/* Compare with someone else */}
      <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Compare with someone else
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allCandidates
            .filter(
              (c: { id: string }) => c.id !== id1 && c.id !== id2
            )
            .map((c: { id: string; name: string; party: string }) => (
              <Link
                key={c.id}
                href={`/compare/${id1}/${c.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors text-sm"
              >
                <span className="font-medium text-slate-700 truncate">
                  {c.name}
                </span>
                <span className="text-xs text-slate-400">({c.party})</span>
              </Link>
            ))}
        </div>
      </div>

      {/* Back */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Search by PIN code
        </Link>
      </div>
    </div>
  );
}
