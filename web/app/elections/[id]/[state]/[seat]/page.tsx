import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import MarginStrip from "@/components/election/MarginStrip";
import SeatHistory from "@/components/election/SeatHistory";
import { contestHref, findSeat, isResultElection, loadResults, marginsInState, ordinal, RESULT_ELECTIONS, seatWinner, turnout } from "@/lib/lok-sabha";
import { formatNumber } from "@/lib/lok-sabha-2024";
import { partyColor } from "@/lib/party-colors";

interface PageProps { params: Promise<{ id: string; state: string; seat: string }> }

// 2024 seats have their own pages under /seats; this route serves the older elections.
export function generateStaticParams() {
  return RESULT_ELECTIONS.filter((id) => id !== "lok-sabha-2024").flatMap((id) =>
    (loadResults(id)?.seats ?? []).map((seat) => ({ id, state: seat.stateSlug, seat: seat.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, state, seat: slug } = await params;
  const seat = isResultElection(id) ? findSeat(id, state, slug) : undefined;
  if (!seat) return { title: "Seat not found" };
  const year = id.slice(-4);
  const winner = seatWinner(seat);
  return {
    title: `${seat.name}, ${seat.state}: ${year} Lok Sabha result | Vote Better`,
    description: `${winner?.name ?? "The winner"} won ${seat.name} in ${year}. Every candidate, their votes and the official ECI source.`,
  };
}

const reservationLabel: Record<string, string> = { GEN: "General seat", SC: "Reserved for Scheduled Castes", ST: "Reserved for Scheduled Tribes" };

export default async function ContestPage({ params }: PageProps) {
  const { id, state, seat: slug } = await params;
  if (!isResultElection(id)) notFound();
  if (id === "lok-sabha-2024") redirect(contestHref(id, { stateSlug: state, slug }));
  const results = loadResults(id);
  const seat = findSeat(id, state, slug);
  if (!results || !seat) notFound();
  const year = id.slice(-4);
  const party = (code: string) => results.parties[code]?.name ?? code;
  const winner = seatWinner(seat);
  const share = turnout(seat);
  const dots = marginsInState(results, seat.stateSlug).map(({ seat: other, margin }) => ({ key: other.slug, name: other.name, margin, href: contestHref(id, other) }));
  const rank = dots.findIndex((dot) => dot.key === seat.slug) + 1;
  const rows = seat.candidates.map((candidate) => Number(candidate.locator.replace("Worksheet, row ", "")));

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-[#286b4e]" aria-label="Breadcrumb">
        <Link href="/elections" className="hover:underline">Elections</Link>
        <span className="mx-2 text-[#a3b7a7]" aria-hidden="true">/</span>
        <Link href={`/elections/${id}`} className="hover:underline">Lok Sabha {year}</Link>
      </nav>

      <header className="mt-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2a7658]">Lok Sabha {year} · {seat.state}</p>
        <h1 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.07em] text-[#19372d]">{seat.name}</h1>
        <p className="mt-3 text-sm text-[#66796d]">{reservationLabel[seat.reservation] ?? seat.reservation} · {results.election.name}</p>
      </header>

      {winner && (
        <section className="mt-8 overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white" aria-labelledby="winner-heading">
          <div className="flex gap-4 p-6 sm:p-8">
            <span className="w-2 shrink-0 rounded-full" style={{ background: partyColor(winner.party) }} aria-hidden="true" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#4c8063]">Won the seat</p>
              <h2 id="winner-heading" className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#18372b]">{winner.name}</h2>
              <p className="mt-1 text-[#4f6455]">{party(winner.party)}</p>
              {winner.margin !== null && (
                <p className="mt-4 text-[15px] leading-7 text-[#43594a]">
                  Won by <strong className="text-[#19372d]">{formatNumber(winner.margin)} votes</strong>
                  {seat.candidates[1] ? <> over {seat.candidates[1].name} ({seat.candidates[1].party})</> : null}.
                  {rank && dots.length > 1 ? <> The {rank === 1 ? "widest" : `${ordinal(rank)} widest`} margin of {dots.length} seats in {seat.state}.</> : null}
                </p>
              )}
            </div>
          </div>
          {winner.how === "contested" && (
            <dl className="grid grid-cols-2 gap-px border-t border-[#e6ede6] bg-[#e6ede6] sm:grid-cols-4">
              {[
                ["Vote share", winner.share === null ? "Not stated" : `${winner.share.toFixed(2)}%`],
                ["Votes", formatNumber(seat.candidates[0].votes)],
                ["Candidates", String(seat.candidates.length)],
                ["Turnout", share === null ? "Not stated" : `${share.toFixed(1)}%`],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#f8faf7] p-4 sm:p-5">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8c7e]">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold text-[#19372d]">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {winner.how === "winner-only" && (
            <p className="border-t border-[#e6ede6] bg-[repeating-linear-gradient(135deg,#eef3ed_0_6px,#f8faf7_6px_12px)] p-5 text-sm leading-6 text-[#576c60]">
              <strong className="text-[#19372d]">Full results not available.</strong> ECI&apos;s detailed {year} results file leaves out this seat. The winner and margin come from ECI&apos;s list of successful candidates.
            </p>
          )}
        </section>
      )}

      {dots.length > 1 && (
        <section className="mt-8 rounded-[24px] border border-[#dce6dc] bg-white p-5 sm:p-7" aria-labelledby="close-heading">
          <h2 id="close-heading" className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">How close was it, compared with {seat.state}?</h2>
          <p className="mt-1 text-sm text-[#66796d]">Each dot is one seat in {seat.state} in {year}. Tap a dot to open that seat.</p>
          <div className="mt-4"><MarginStrip dots={dots} highlight={seat.slug} state={seat.state} /></div>
        </section>
      )}

      {seat.candidates.length > 0 && (
        <section className="mt-8" aria-labelledby="candidates-heading">
          <h2 id="candidates-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">Everyone who contested</h2>
          <p className="mt-1 text-sm text-[#66796d]">Ranked by votes. Share is of valid votes, calculated from ECI&apos;s figures.</p>
          <ol className="mt-4 grid gap-2">
            {seat.candidates.map((candidate) => (
              <li key={candidate.slug} className="rounded-2xl border border-[#e3ebe3] bg-white p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#19372d]"><span className="mr-2 text-sm text-[#8a9b8e]">{candidate.rank}.</span>{candidate.name}</p>
                    <p className="mt-0.5 text-sm text-[#5f7465]">{party(candidate.party)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums text-[#19372d]">{formatNumber(candidate.votes)}</p>
                    <p className="text-sm tabular-nums text-[#5f7465]">{candidate.shareOfValidVotes.toFixed(2)}%</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-[#eef3ed]" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(candidate.shareOfValidVotes, 0.4)}%`, background: candidate.rank === 1 ? partyColor(candidate.party) : "#9ec9a8" }} />
                </div>
              </li>
            ))}
            {seat.notaVotes !== null && (
              <li className="flex items-center justify-between rounded-2xl border border-dashed border-[#d5e0d5] p-4 text-sm text-[#5f7465] sm:p-5">
                <span>None of the above (NOTA)</span><span className="tabular-nums">{formatNumber(seat.notaVotes)} votes</span>
              </li>
            )}
          </ol>
          {seat.electors !== null && seat.votesPolled !== null && (
            <p className="mt-4 text-sm text-[#66796d]">{formatNumber(seat.votesPolled)} of {formatNumber(seat.electors)} registered voters cast a vote.</p>
          )}
        </section>
      )}

      <SeatHistory stateSlug={seat.stateSlug} seatSlug={seat.slug} current={id} />

      <section className="mt-8 rounded-[24px] border border-[#dce6dc] bg-white p-6 text-sm leading-6 text-[#4f6455] sm:p-8" aria-labelledby="source-heading">
        <h2 id="source-heading" className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">Where this comes from</h2>
        <p className="mt-2">
          <a href={winner?.how === "winner-only" ? results.references[0]?.url : results.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">
            {results.source.authority}, {winner?.how === "winner-only" ? results.references[0]?.title : results.source.title} ↗
          </a>
          {rows.length ? <> · worksheet rows {Math.min(...rows)} to {Math.max(...rows)}</> : null}
        </p>
        <p className="mt-2">{winner?.how === "winner-only"
          ? "Winner, party and margin as listed by ECI. No candidate rows are available for this seat."
          : "Checked automatically when imported: votes add up in every row, vote shares agree, one NOTA row per seat, and every winner and margin matches ECI\u2019s list of successful candidates."}</p>
        <p className="mt-3 text-xs leading-5 text-[#7a8c7e]">{results.source.disclaimer} {results.source.note}</p>
      </section>
    </div>
  );
}
