import type { LokSabha2024, SourceFile } from "@/lib/lok-sabha-2024";

const day = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// The source, the exact rows, when we captured it and how it was checked.
export default function SourceNote({ data, rows, reviewedAt, file }: { data: LokSabha2024; rows?: string; reviewedAt?: string; file?: SourceFile }) {
  const source = file ?? data.source;
  return (
    <section className="rounded-[24px] border border-[#dce6dc] bg-white p-6 text-sm leading-6 text-[#4f6455] sm:p-8" aria-labelledby="source-heading">
      <h2 id="source-heading" className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">Where this comes from</h2>
      <p className="mt-2">
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">
          {data.source.authority}, {source.title} ↗
        </a>
        {rows ? <> · {rows}</> : null}
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8c7e]">Captured</dt><dd>{day(source.capturedAt)}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8c7e]">Checked</dt><dd>{reviewedAt ? day(reviewedAt) : day(data.publishedAt)}, automated consistency checks</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8c7e]">File fingerprint</dt><dd className="font-mono text-xs break-all">{source.contentHash.slice(0, 19)}…</dd></div>
      </dl>
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold text-[#216146]">What was checked</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Every candidate&apos;s general and postal votes add up to their total.</li>
          <li>Candidate votes in each seat add up to ECI&apos;s valid vote count.</li>
          <li>Every winner and runner-up matches ECI&apos;s separate list of successful candidates.</li>
          <li>Party names come from ECI&apos;s list of political parties.</li>
        </ul>
      </details>
      <p className="mt-4 text-xs leading-5 text-[#7a8c7e]">{data.source.disclaimer} {data.source.note}</p>
    </section>
  );
}
