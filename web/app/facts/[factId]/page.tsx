import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getFactTrace, jaipurPublication } from "@/lib/publication";

interface PageProps {
  params: Promise<{ factId: string }>;
}

export function generateStaticParams() {
  return jaipurPublication.facts.map((fact) => ({ factId: fact.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { factId } = await params;
  const fact = getFactTrace(jaipurPublication, factId);
  return { title: fact ? `Fact source | Vote Better` : "Fact not found" };
}

function display(value: unknown): string {
  return typeof value === "number" ? value.toLocaleString("en-IN") :
    typeof value === "string" ? value : JSON.stringify(value);
}

function label(predicate: string): string {
  const known: Record<string, string> = {
    "candidate.name": "Candidate name",
    "candidate.party": "Party on election return",
    "candidate.votesPolled": "Votes received",
  };
  return known[predicate] ?? predicate.replaceAll(".", " ");
}

export default async function FactPage({ params }: PageProps) {
  const { factId } = await params;
  const fact = getFactTrace(jaipurPublication, factId);
  if (!fact) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href={`/people/${fact.subjectId}`} className="text-sm font-semibold text-emerald-800 hover:underline">← Person profile</Link>
      <header className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Source trail</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{label(fact.predicate)}</h1>
        <p className="mt-4 text-2xl font-semibold text-slate-900">{display(fact.value)}</p>
        <p className="mt-2 text-sm text-slate-600">Published {fact.publishedAt}</p>
      </header>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" aria-label="Evidence details">
        <h2 className="text-xl font-bold text-slate-900">How this fact was checked</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
          <dt className="font-semibold text-slate-600">Source</dt>
          <dd><a href={fact.source.url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-emerald-800 underline">Open official document ↗</a></dd>
          <dt className="font-semibold text-slate-600">Location in source</dt><dd>{fact.source.locator}</dd>
          <dt className="font-semibold text-slate-600">Document hash</dt><dd className="break-all font-mono text-xs">{fact.source.contentHash}</dd>
          <dt className="font-semibold text-slate-600">Source date</dt>
          <dd>{fact.source.validFrom ? `${fact.source.validFrom.originalText} (${fact.source.validFrom.precision})` : "Not stated"}</dd>
          <dt className="font-semibold text-slate-600">Captured</dt><dd>{fact.source.capturedAt}</dd>
          <dt className="font-semibold text-slate-600">Normalized</dt><dd>{fact.source.normalizedAt} · {fact.source.normalizerVersion}</dd>
          <dt className="font-semibold text-slate-600">Recorded</dt><dd>{fact.source.recordedAt}</dd>
          <dt className="font-semibold text-slate-600">Reviewed</dt><dd>{fact.reviewedAt}</dd>
          <dt className="font-semibold text-slate-600">Review method</dt>
          <dd>{fact.reviewMethod === "agent-visual-check" ? "Agent visual check of the official document" : "Recorded reviewer decision"}</dd>
          <dt className="font-semibold text-slate-600">Published</dt><dd>{fact.publishedAt}</dd>
          <dt className="font-semibold text-slate-600">Revision</dt><dd className="break-all font-mono text-xs">{fact.revisionId}</dd>
          {fact.priorFactId && <><dt className="font-semibold text-slate-600">Earlier version</dt><dd><Link href={`/facts/${fact.priorFactId}`} className="text-emerald-800 underline">View previous fact</Link></dd></>}
        </dl>
      </section>
    </main>
  );
}
