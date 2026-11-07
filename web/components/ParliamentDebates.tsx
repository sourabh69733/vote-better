import type { getParliamentaryDebates, ParliamentaryDebate } from "@/lib/parliamentary-debates";

type Work = NonNullable<ReturnType<typeof getParliamentaryDebates>>;

function categoryCounts(records: ParliamentaryDebate[]) {
  const counts = new Map<string, number>();
  for (const record of records) if (record.category) counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4);
}

function DebateRow({ record }: { record: ParliamentaryDebate }) {
  return <li className="rounded-xl border border-[#dce8dd] bg-white p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#587061]">Session {record.session} · {record.date}{record.category ? ` · ${record.category}` : ""}</p>
    <h4 className="mt-1 font-semibold leading-6 text-[#19372d]">{record.title}</h4>
    {record.participantNames.length > 1 && <p className="mt-1 text-sm text-[#526558]">Listed with {record.participantNames.length - 1} other member{record.participantNames.length > 2 ? "s" : ""}</p>}
    <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">Read official debate record ↗</a>
  </li>;
}

export function ParliamentDebates({ work }: { work: Work }) {
  return <div className="rounded-2xl border border-[#c8dfce] bg-[#f4faf4] p-5 sm:p-6">
    <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#35684b]">Debates and matters · 18th Lok Sabha</h3>
    <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
      <strong className="text-5xl font-semibold tabular-nums tracking-[-0.06em] text-[#19372d]">{work.totalRecords}</strong>
      <p className="max-w-sm pb-1 text-sm leading-6 text-[#405b49]">debate records listing this MP</p>
    </div>
    <p className="mt-2 text-sm leading-6 text-[#4d6354]">These official feed entries list this MP; some entries were laid rather than spoken. A record is not proof of an outcome.</p>
    <p className="mt-3 text-xs text-[#526b58]">Digital Sansad member-filtered feed collected {work.collectedOn}. <a href={work.directoryUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline underline-offset-4">Search official debates ↗</a></p>
    {work.records.length > 0 && <>
      <div className="mt-5 border-t border-[#d6e7d9] pt-4">
        <p className="text-sm font-bold text-[#19372d]">Types in these records</p>
        <ul className="mt-3 flex flex-wrap gap-2">{categoryCounts(work.records).map(([category, count]) => <li key={category} className="rounded-full border border-[#d4e4d5] bg-white px-3 py-2 text-xs font-semibold text-[#284d38]">{category} · {count}</li>)}</ul>
      </div>
      <div className="mt-5 border-t border-[#d6e7d9] pt-4">
        <p className="mb-3 text-sm font-bold text-[#19372d]">Latest listed records</p>
        <ol className="grid gap-3">{work.records.slice(0, 3).map((record) => <DebateRow key={record.id} record={record} />)}</ol>
      </div>
      <details className="mt-5 border-t border-[#d6e7d9] pt-4">
        <summary className="min-h-11 cursor-pointer font-semibold text-emerald-800">See all {work.totalRecords} debate records</summary>
        <ol className="mt-3 grid gap-3">{work.records.map((record) => <DebateRow key={record.id} record={record} />)}</ol>
      </details>
    </>}
    <details className="mt-4 text-xs leading-5 text-[#526b58]">
      <summary className="min-h-11 cursor-pointer font-semibold text-emerald-800">How these records were checked</summary>
      <p className="mt-2">The importer checked the member ID and name in the official directory, the member participation on every record, the complete filtered result count, and the saved feed-page hashes.</p>
      <ul className="mt-2 grid gap-1">{work.sourcePages.map((page, index) => <li key={page.sha256} className="break-all"><a href={page.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline underline-offset-4">Feed page {index + 1}</a> · {page.count} records · SHA-256 {page.sha256}</li>)}</ul>
    </details>
  </div>;
}
