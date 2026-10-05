import { getAreaCoverage } from "@/lib/publication";

function shortDate(instant: string): string {
  return new Date(instant).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
}

const labels = {
  covered: "Covered",
  partial: "Partial",
  missing: "Missing",
  stale: "Check failed",
  disputed: "Needs review",
  "not-covered": "Not covered",
};

export function ResultCoverage({ areaId }: { areaId: string }) {
  const coverage = getAreaCoverage(areaId);
  if (!coverage) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6" aria-label="Election result coverage">
        <h2 className="text-lg font-bold text-slate-900">Election result coverage</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Automated coverage is not yet assessed for this area. See each displayed record for its own source.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6" aria-label="Election result coverage">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Election result coverage</h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-900">{labels[coverage.state]}</span>
      </div>
      {coverage.observedCandidateRows === null ? (
        <p className="mt-4 text-sm text-slate-700">No candidate result rows have been captured.</p>
      ) : (
        <p className="mt-4 text-sm text-slate-700">
          <strong className="text-2xl font-bold text-slate-900">{coverage.publishedCandidateRows} of {coverage.observedCandidateRows}</strong>
          <span className="mt-1 block">candidate result rows published from this official return</span>
        </p>
      )}
      <p className="mt-3 text-sm leading-6 text-slate-700">{coverage.reason}</p>
      {coverage.lastAttemptedAt && <p className="mt-3 text-xs font-medium text-slate-600">Last source check {shortDate(coverage.lastAttemptedAt)}{coverage.lastAttemptOutcome === "succeeded" ? " · succeeded" : " · failed"}</p>}
      <details className="mt-4 border-t border-amber-200 pt-3 text-sm text-slate-700">
        <summary className="cursor-pointer font-semibold text-emerald-800">Dates and source</summary>
        <dl className="mt-3 grid gap-2">
          {coverage.lastAttemptedAt && <div><dt className="font-semibold">Source checked</dt><dd>{coverage.lastAttemptedAt}</dd></div>}
          {coverage.lastCapturedAt && <div><dt className="font-semibold">Snapshot captured</dt><dd>{coverage.lastCapturedAt}</dd></div>}
          {coverage.lastReviewedAt && <div><dt className="font-semibold">Last review</dt><dd>{coverage.lastReviewedAt}</dd></div>}
          {coverage.lastPublishedAt && <div><dt className="font-semibold">Last publication</dt><dd>{coverage.lastPublishedAt}</dd></div>}
        </dl>
        <a href={coverage.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold text-emerald-800 underline underline-offset-4">Open official return ↗</a>
      </details>
    </section>
  );
}
