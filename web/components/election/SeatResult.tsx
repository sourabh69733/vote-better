import Link from "next/link";
import type { ReactNode } from "react";

import { Breadcrumb, Card, Eyebrow, NotCollected, SectionHeading, StatGrid } from "@/components/ui";
import { assemblySeatsIn, candidateHref, ELECTION_INFO, findSeat, formatNumber, marginsInState, ordinal, requireResults, seatHref, seatWinner, turnout, yearOf, type ResultElectionId, type ResultSeat } from "@/lib/results";
import { partyColor } from "@/lib/party-colors";
import MarginStrip from "./MarginStrip";
import SeatHistory from "./SeatHistory";
import SourceNote from "./SourceNote";

const reservationLabel: Record<string, string> = { GEN: "General seat", SC: "Reserved for Scheduled Castes", ST: "Reserved for Scheduled Tribes" };

// One seat in one election, Lok Sabha or assembly. 2024 Lok Sabha seats add candidate pages and a comparison.
export default function SeatResult({ id, seat, actions, aside }: { id: ResultElectionId; seat: ResultSeat; actions?: ReactNode; aside?: ReactNode }) {
  const results = requireResults(id);
  const year = yearOf(id);
  const info = ELECTION_INFO[id];
  const parent = seat.parliament ? findSeat("lok-sabha-2024", seat.stateSlug, seat.parliament.slug) : undefined;
  const segments = id === "lok-sabha-2024" ? assemblySeatsIn(seat.stateSlug, seat.slug) : [];
  const has2024Pages = id === "lok-sabha-2024";
  const party = (code: string) => results.parties[code]?.name ?? code;
  const winner = seatWinner(seat);
  const share = turnout(seat);
  const dots = marginsInState(results, seat.stateSlug).map(({ seat: other, margin }) => ({ key: other.slug, name: other.name, margin, href: seatHref(other, id) }));
  const rank = dots.findIndex((dot) => dot.key === seat.slug) + 1;
  const runnerUp = seat.candidates[1];
  const names = new Map<string, number>();
  for (const candidate of seat.candidates) names.set(candidate.name, (names.get(candidate.name) ?? 0) + 1);
  const rowNumbers = seat.candidates.map((candidate) => Number(candidate.locator.replace("Worksheet, row ", "")));
  const rows = rowNumbers.length ? `worksheet rows ${Math.min(...rowNumbers)} to ${Math.max(...rowNumbers)}` : undefined;
  const file = seat.unopposed ? results.references.find((ref) => ref.title.includes("report 2A"))
    : seat.winnerOnly ? results.references.find((ref) => ref.title.includes("Successful")) : undefined;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <Breadcrumb items={[{ href: "/elections", label: "Elections" }, { href: `/elections/${id}`, label: info.label }]} />

      <header className="mt-6">
        <Eyebrow>{info.label}{seat.number ? ` · seat ${seat.number}` : ""}{info.body === "lok-sabha" ? ` · ${seat.state}` : ""}</Eyebrow>
        <h1 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.07em] text-ink">{seat.name}</h1>
        <p className="mt-3 text-sm text-muted">{reservationLabel[seat.reservation] ?? seat.reservation} · {results.election.name}</p>
        {parent && (
          <p className="mt-2 text-sm text-body">
            Part of the <Link href={seatHref(parent)} className="font-semibold text-link underline underline-offset-4">{parent.name} Lok Sabha seat</Link>.
          </p>
        )}
      </header>

      {winner && (
        <section className="mt-8 overflow-hidden rounded-[24px] border border-line bg-surface" aria-labelledby="winner-heading">
          <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="flex gap-4">
              <span className="w-2 shrink-0 rounded-full" style={{ background: partyColor(winner.party) }} aria-hidden="true" />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-eyebrow">{winner.how === "unopposed" ? "Elected unopposed" : "Won the seat"}</p>
                <h2 id="winner-heading" className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">{winner.name}</h2>
                <p className="mt-1 text-body">{party(winner.party)}</p>
                {winner.margin !== null && (
                  <p className="mt-4 text-[15px] leading-7 text-body">
                    Won by <strong className="text-ink">{formatNumber(winner.margin)} votes</strong>
                    {runnerUp ? <> over {runnerUp.name} ({runnerUp.party})</> : null}.
                    {rank && dots.length > 1 ? <> The {rank === 1 ? "widest" : `${ordinal(rank)} widest`} margin of {dots.length} seats in {seat.state}.</> : null}
                  </p>
                )}
                {seat.unopposed && (
                  <p className="mt-4 max-w-2xl text-[15px] leading-7 text-body">
                    No vote was held. {seat.unopposed.nominated} people filed nominations, {seat.unopposed.rejected} were rejected and {seat.unopposed.withdrawn} withdrew, leaving one candidate.
                  </p>
                )}
              </div>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {winner.how === "contested" && (
            <div className="border-t border-line-soft">
              <StatGrid stats={[
                ["Vote share", winner.share === null ? "Not stated" : `${winner.share.toFixed(2)}%`],
                ["Votes", formatNumber(seat.candidates[0].votes)],
                ["Candidates", String(seat.candidates.length)],
                ["Turnout", share === null ? "Not stated" : `${share.toFixed(1)}%`],
              ]} />
            </div>
          )}
          {winner.how === "winner-only" && (
            <NotCollected title="Full results not available." className="rounded-none border-0 border-t">
              ECI&apos;s detailed {year} results file leaves out this seat. The winner and margin come from ECI&apos;s list of successful candidates.
            </NotCollected>
          )}
        </section>
      )}

      {dots.length > 1 && (
        <Card className="mt-8" labelledBy="close-heading">
          <h2 id="close-heading" className="text-lg font-semibold tracking-[-0.02em] text-ink">How close was it, compared with {seat.state}?</h2>
          <p className="mt-1 text-sm text-muted">Each dot is one seat in {seat.state} in {year}. Tap a dot to open that seat.</p>
          <div className="mt-4"><MarginStrip dots={dots} highlight={seat.slug} state={seat.state} /></div>
        </Card>
      )}

      {aside}

      {segments.length > 0 && (
        <section className="mt-8" aria-labelledby="segments-heading">
          <SectionHeading id="segments-heading" title="Assembly seats in this Lok Sabha seat" lead="Each elects its own MLA to the state assembly. Winners from the latest assembly election." />
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {segments.map(({ id: assemblyId, seat: segment, winner: mla }) => (
              <li key={segment.slug}>
                <Link href={seatHref(segment, assemblyId)} className="group flex items-center gap-3 rounded-2xl border border-line-soft bg-surface p-4 hover:border-line-strong">
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: partyColor(mla?.party) }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink group-hover:underline">{segment.name}</span>
                    <span className="block truncate text-sm text-body">{mla ? `${mla.name}, ${mla.party} · ${ELECTION_INFO[assemblyId].label}` : "No result"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {seat.candidates.length > 0 && (
        <section className="mt-8" aria-labelledby="candidates-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeading id="candidates-heading" title="Everyone who contested" lead={`Ranked by votes. Share is of valid votes${has2024Pages ? "" : ", calculated from ECI's figures"}.`} />
            {has2024Pages && seat.candidates.length > 1 && (
              <Link href={`${seatHref(seat)}/compare`} className="inline-flex min-h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-bold text-link hover:bg-tint">Compare two candidates</Link>
            )}
          </div>
          <ol className="mt-4 grid gap-2">
            {seat.candidates.map((candidate) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink group-hover:underline"><span className="mr-2 text-sm text-subtle">{candidate.rank}.</span>{candidate.name}</p>
                      <p className="mt-0.5 text-sm text-body">{party(candidate.party)}{candidate.partySymbol && candidate.party === "IND" ? ` · symbol: ${candidate.partySymbol}` : ""}</p>
                      {(names.get(candidate.name) ?? 0) > 1 && <p className="mt-1 text-xs font-semibold text-warn">Another candidate here has the same name. Check the party.</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums text-ink">{formatNumber(candidate.votes)}</p>
                      <p className="text-sm tabular-nums text-body">{candidate.shareOfValidVotes.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-track" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(candidate.shareOfValidVotes, 0.4)}%`, background: candidate.rank === 1 ? partyColor(candidate.party) : "#9ec9a8" }} />
                  </div>
                </>
              );
              const box = "block rounded-2xl border border-line-soft bg-surface p-4 sm:p-5";
              return (
                <li key={candidate.slug}>
                  {has2024Pages ? <Link href={candidateHref(seat, candidate)} className={`group ${box} hover:border-line-strong`}>{body}</Link> : <div className={box}>{body}</div>}
                </li>
              );
            })}
            {seat.notaVotes !== null && (
              <li className="flex items-center justify-between rounded-2xl border border-dashed border-line p-4 text-sm text-body sm:p-5">
                <span>None of the above (NOTA)</span><span className="tabular-nums">{formatNumber(seat.notaVotes)} votes</span>
              </li>
            )}
          </ol>
          {seat.electors !== null && seat.votesPolled !== null && (
            <p className="mt-4 text-sm text-muted">{formatNumber(seat.votesPolled)} of {formatNumber(seat.electors)} registered voters cast a vote.</p>
          )}
        </section>
      )}

      <SeatHistory stateSlug={seat.stateSlug} seatSlug={seat.slug} current={id} />

      <div className="mt-8"><SourceNote data={results} rows={rows} file={file} /></div>
    </div>
  );
}
