import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { candidateHref, findSeat, formatNumber, requireResults, type ResultCandidate, seatHref } from "@/lib/lok-sabha";
import SourceNote from "@/components/election/SourceNote";

interface PageProps {
  params: Promise<{ state: string; seat: string }>;
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, seat: slug } = await params;
  const seat = findSeat("lok-sabha-2024", state, slug);
  return { title: seat ? `Compare candidates in ${seat.name} | Vote Better` : "Seat not found" };
}

const genderLabel = { female: "Female", male: "Male", third: "Third gender" } as const;
const categoryLabel: Record<string, string> = { GENERAL: "General", SC: "Scheduled Caste", ST: "Scheduled Tribe" };

export default async function ComparePage({ params, searchParams }: PageProps) {
  const { state, seat: slug } = await params;
  const seat = findSeat("lok-sabha-2024", state, slug);
  if (!seat || seat.candidates.length < 2) notFound();
  const query = await searchParams;
  const pick = (value: string | string[] | undefined, fallback: ResultCandidate) =>
    seat.candidates.find((candidate) => candidate.slug === value) ?? fallback;
  const a = pick(query.a, seat.candidates[0]);
  const b = pick(query.b, seat.candidates[a.slug === seat.candidates[1].slug ? 0 : 1]);
  const data = requireResults("lok-sabha-2024");
  const party = (code: string) => data.parties[code]?.name ?? code;

  const rows: { label: string; value: (c: ResultCandidate) => string; pending?: boolean }[] = [
    { label: "Party", value: (c) => party(c.party) },
    { label: "Result", value: (c) => (c.rank === 1 ? "Won" : `Finished ${c.rank} of ${seat.candidates.length}`) },
    { label: "Votes", value: (c) => formatNumber(c.votes) },
    { label: "Share of valid votes", value: (c) => `${c.shareOfValidVotes.toFixed(2)}%` },
    { label: "Postal votes", value: (c) => formatNumber(c.postalVotes) },
    { label: "Age at the election", value: (c) => (c.age === null ? "Not stated" : String(c.age)) },
    { label: "Gender", value: (c) => (c.gender ? genderLabel[c.gender] : "Not stated") },
    { label: "Category", value: (c) => (c.category ? categoryLabel[c.category] ?? c.category : "Not stated") },
    { label: "Election symbol", value: (c) => c.partySymbol ?? "Not stated" },
    { label: "Education", value: () => "Not collected yet", pending: true },
    { label: "Declared assets", value: () => "Not collected yet", pending: true },
    { label: "Declared cases", value: () => "Not collected yet", pending: true },
  ];

  const select = (name: "a" | "b", selected: ResultCandidate) => (
    <label className="grid min-w-0 gap-1 text-xs font-bold uppercase tracking-[0.1em] text-subtle">
      {name === "a" ? "First" : "Second"}
      <select name={name} defaultValue={selected.slug} className="min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-white px-3 text-sm font-semibold normal-case tracking-normal text-ink">
        {seat.candidates.map((candidate) => (
          <option key={candidate.slug} value={candidate.slug}>{candidate.rank}. {candidate.name} ({candidate.party})</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-link" aria-label="Breadcrumb">
        <Link href="/seats" className="hover:underline">All seats</Link>
        <span className="mx-2 text-subtle" aria-hidden="true">/</span>
        <Link href={seatHref(seat)} className="hover:underline">{seat.name}</Link>
      </nav>
      <h1 className="mt-6 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.06em] text-ink">Compare candidates in {seat.name}</h1>
      <p className="mt-2 text-sm text-muted">Lok Sabha 2024 · {seat.state} · Only checked facts are shown.</p>

      <form method="get" className="mt-6 grid gap-3 rounded-[24px] border border-line bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5">
        {select("a", a)}
        {select("b", b)}
        <button type="submit" className="min-h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong">Compare</button>
      </form>

      <section className="mt-4 overflow-hidden rounded-[24px] border border-line bg-white" aria-label="Comparison">
        <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-line-soft bg-surface-soft">
          <span />
          {[a, b].map((candidate) => (
            <Link key={candidate.slug} href={candidateHref(seat, candidate)} className="p-3 text-sm font-bold text-ink hover:underline sm:p-4 sm:text-base">{candidate.name}</Link>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-track px-0 py-3">
          <span className="px-3 text-xs font-bold uppercase tracking-[0.1em] text-subtle sm:px-4">Vote share</span>
          {[a, b].map((candidate) => (
            <div key={candidate.slug} className="px-3 sm:px-4">
              <div className="h-2 rounded-full bg-track" aria-hidden="true">
                <div className={`h-full rounded-full ${candidate.rank === 1 ? "bg-brand" : "bg-line-strong"}`} style={{ width: `${Math.max(candidate.shareOfValidVotes, 0.5)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <dl>
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-track text-sm last:border-0">
              <dt className="p-3 text-muted sm:p-4">{row.label}</dt>
              {[a, b].map((candidate) => (
                <dd key={candidate.slug} className={`p-3 sm:p-4 ${row.pending ? "text-subtle" : "font-semibold text-ink"}`}>{row.value(candidate)}</dd>
              ))}
            </div>
          ))}
        </dl>
      </section>

      {a.slug !== b.slug && (
        <p className="mt-4 text-[15px] leading-7 text-body">
          {a.votes === b.votes ? `${a.name} and ${b.name} got the same number of votes.` : `${a.votes > b.votes ? a.name : b.name} got ${formatNumber(Math.abs(a.votes - b.votes))} more votes than ${a.votes > b.votes ? b.name : a.name}.`}
        </p>
      )}

      <div className="mt-6">
        <SourceNote data={data} rows={`worksheet rows ${a.locator.replace("Worksheet, row ", "")} and ${b.locator.replace("Worksheet, row ", "")}`} />
      </div>
    </div>
  );
}
