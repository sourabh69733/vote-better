import type { ElectionResults, ResultFile } from "@/lib/results";

const day = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const CHECKS: Record<"2024" | "older" | "assembly", string[]> = {
  assembly: [
    "Every candidate's general and postal votes add up to their total.",
    "Every winner, runner-up and margin matches ECI's list of successful candidates.",
    "Electors, NOTA and valid votes match ECI's seat-wise voters report.",
    "Every party's seat count matches ECI's party performance report.",
  ],
  "2024": [
    "Every candidate's general and postal votes add up to their total.",
    "Candidate votes in each seat add up to ECI's valid vote count.",
    "Every winner and runner-up matches ECI's separate list of successful candidates.",
    "Party names come from ECI's list of political parties.",
  ],
  older: [
    "Every candidate's general and postal votes add up to their total.",
    "Vote shares in each seat agree with each other, and each seat has one NOTA row.",
    "Every winner and margin matches ECI's separate list of successful candidates.",
    "Vote share and valid votes are calculated from ECI's figures.",
  ],
};

// The source, the exact rows, when we captured it and how it was checked.
export default function SourceNote({ data, rows, reviewedAt, file }: { data: ElectionResults; rows?: string; reviewedAt?: string; file?: ResultFile }) {
  const source = file ?? data.source;
  const checks = CHECKS[data.election.id === "lok-sabha-2024" ? "2024" : data.election.id.includes("assembly") ? "assembly" : "older"];
  return (
    <section className="rounded-[24px] border border-line bg-surface p-6 text-sm leading-6 text-body sm:p-8" aria-labelledby="source-heading">
      <h2 id="source-heading" className="text-lg font-semibold tracking-[-0.02em] text-ink">Where this comes from</h2>
      <p className="mt-2">
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link underline decoration-line-strong underline-offset-4">
          {data.source.authority}, {source.title} ↗
        </a>
        {rows ? <> · {rows}</> : null}
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Captured</dt><dd>{day(source.capturedAt)}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Checked</dt><dd>{reviewedAt ? day(reviewedAt) : day(data.publishedAt)}, automated consistency checks</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">File fingerprint</dt><dd className="font-mono text-xs break-all">{source.contentHash.slice(0, 19)}…</dd></div>
      </dl>
      {file ? null : (
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold text-link">What was checked</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">{checks.map((check) => <li key={check}>{check}</li>)}</ul>
        </details>
      )}
      <p className="mt-4 text-xs leading-5 text-subtle">{data.source.disclaimer} {data.source.note}</p>
    </section>
  );
}
