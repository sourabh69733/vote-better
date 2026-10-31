import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import MarginStrip from "@/components/election/MarginStrip";
import ScheduleTimeline from "@/components/election/ScheduleTimeline";
import SeatFilter from "@/components/election/SeatFilter";
import { BODY_LABEL, STATUS_LABEL, electionStatus, formatDay, todayIso, type Election } from "@/lib/elections";
import { contestHref, electionTotals, isResultElection, loadResults, marginsInState, seatWinner, statesOf, type LokSabhaResults } from "@/lib/lok-sabha";
import { formatNumber, formatShort } from "@/lib/lok-sabha-2024";
import { partyColor } from "@/lib/party-colors";
import { elections } from "@/records/elections";

interface PageProps { params: Promise<{ id: string }> }

export const revalidate = 3600;

export function generateStaticParams() {
  return elections.map((election) => ({ id: election.id }));
}

const find = (id: string) => elections.find((election) => election.id === id);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const election = find((await params).id);
  if (!election) return { title: "Election not found" };
  return {
    title: `${election.name} | Vote Better`,
    description: `${election.name}: schedule from the Election Commission of India${isResultElection(election.id) ? ", and every seat's result with its source" : ""}.`,
  };
}

function Sources({ election }: { election: Election }) {
  return (
    <details className="mt-6 rounded-[20px] border border-[#dce6dc] bg-white p-5 text-sm">
      <summary className="cursor-pointer font-semibold text-[#216146]">Sources for these dates ({election.sources.length})</summary>
      <ul className="mt-3 space-y-2">
        {election.sources.map((source) => (
          <li key={source.url + source.title} className="text-[#576c60]">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[#1d6547] underline underline-offset-4">{source.title}</a>
            <span className="block text-xs text-[#7a8c7e]">{source.publisher} · checked {formatDay(source.checkedOn)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Results({ election, results }: { election: Election; results: LokSabhaResults }) {
  const totals = electionTotals(results);
  const party = (code: string) => results.parties[code]?.name ?? code;
  const states = statesOf(results);
  return (
    <>
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[#dce6dc] bg-[#e6ede6] sm:grid-cols-4">
        {[
          ["Seats", formatNumber(results.seats.length)],
          ["Candidates", formatNumber(totals.candidates)],
          ["Turnout", totals.turnout === null ? "Not stated" : `${totals.turnout.toFixed(1)}%`],
          ["Closest seat", totals.closest ? `${totals.closest.seat.name}, ${formatNumber(totals.closest.margin)}` : "Not stated"],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#f8faf7] p-4 sm:p-5">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8c7e]">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-[#19372d]">{value}</dd>
          </div>
        ))}
      </dl>
      {results.source.note && <p className="mt-3 text-sm text-[#66796d]">{results.source.note}</p>}

      <section className="mt-10" aria-labelledby="seats-heading">
        <h2 id="seats-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">Every seat</h2>
        <p className="mt-1 mb-5 text-sm text-[#66796d]">Grouped by state. The line under each state shows how close its seats were: each dot is a seat, further right is a wider win.</p>
        <SeatFilter target="seat-list" placeholder="Type a seat, state or winner, e.g. Jaipur" />
        <div id="seat-list" className="mt-4 grid gap-3">
          {states.map((state) => {
            const dots = marginsInState(results, state.stateSlug).map(({ seat, margin }) => ({ key: seat.slug, name: seat.name, margin, href: contestHref(results.election.id, seat) }));
            return (
              <details key={state.stateSlug} data-state-group className="group rounded-[20px] border border-[#dce6dc] bg-white">
                <summary className="cursor-pointer list-none px-5 py-4">
                  <span className="flex items-center justify-between gap-4 font-semibold text-[#19372d]">
                    <span>{state.state} <span className="ml-2 text-sm font-normal text-[#7a8c7e]">{state.seats.length} {state.seats.length === 1 ? "seat" : "seats"}</span></span>
                    <span className="text-[#7a8c7e] transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                  </span>
                  {dots.length > 1 && <span className="mt-2 block max-w-xl"><MarginStrip dots={dots} state={state.state} compact /></span>}
                </summary>
                {dots.length >= 3 && (
                  <p className="border-t border-[#eef3ed] px-5 pt-3 text-sm">
                    <Link href={`/share/closest/${results.election.id}/${state.stateSlug}`} className="font-semibold text-[#1d6547] underline underline-offset-4">Share the closest fights in {state.state}</Link>
                  </p>
                )}
                <ul className="grid gap-2 p-3 sm:grid-cols-2">
                  {state.seats.map((seat) => {
                    const winner = seatWinner(seat);
                    return (
                      <li key={seat.slug} data-search={`${seat.name} ${seat.state} ${winner?.name ?? ""} ${winner ? party(winner.party) : ""}`.toLocaleLowerCase("en-IN")}>
                        <Link href={contestHref(results.election.id, seat)} className="group/seat flex items-center gap-3 rounded-2xl border border-[#e3ebe3] p-4 hover:border-[#bcd6c3]">
                          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: partyColor(winner?.party) }} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-[#19372d] group-hover/seat:underline">{seat.name}</span>
                            <span className="block truncate text-sm text-[#5f7465]">{winner ? `${winner.name}, ${winner.party}` : "No result"}</span>
                          </span>
                          <span className="shrink-0 text-right text-xs text-[#66796d]">
                            {winner?.how === "unopposed" ? "Unopposed" : winner?.margin !== null && winner?.margin !== undefined ? <>by <span className="font-semibold tabular-nums text-[#19372d]">{formatShort(winner.margin)}</span></> : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </section>
      <p className="mt-6 text-xs leading-5 text-[#7a8c7e]">
        Results: <a href={results.source.url} target="_blank" rel="noopener noreferrer" className="underline">{results.source.authority}, {results.source.title} ↗</a>. {results.source.disclaimer}
        {election.id === "lok-sabha-2024" ? null : " Candidate profiles are available for 2024 only so far."}
      </p>
    </>
  );
}

export default async function ElectionPage({ params }: PageProps) {
  const { id } = await params;
  const election = find(id);
  if (!election) notFound();
  const today = todayIso();
  const status = electionStatus(election, today);
  const results = isResultElection(election.id) ? loadResults(election.id) : undefined;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-[#286b4e]" aria-label="Breadcrumb">
        <Link href="/elections" className="hover:underline">Elections</Link>
      </nav>
      <header className="mt-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2a7658]">{BODY_LABEL[election.body]} · {election.states.join(", ")}</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-[#19372d]">{election.name}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#66796d]">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "polling" || status === "counting" ? "bg-[#1c6047] text-white" : "bg-[#eef3ed] text-[#526a59]"}`}>{STATUS_LABEL[status]}</span>
          {election.seats ? <span>{formatNumber(election.seats)} {election.seats === 1 ? "seat" : "seats"}</span> : null}
        </p>
      </header>

      <section className="mt-8 rounded-[24px] border border-[#dce6dc] bg-white p-5 sm:p-7" aria-labelledby="schedule-heading">
        <h2 id="schedule-heading" className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">Schedule</h2>
        {election.polls.length ? (
          <>
            <div className="mt-4"><ScheduleTimeline election={election} today={today} /></div>
            {election.polls.length > 1 && (
              <ol className="mt-4 grid gap-x-6 gap-y-1 text-sm text-[#43594a] sm:grid-cols-3">
                {election.polls.map((poll) => <li key={poll.date}><span className="font-semibold text-[#19372d]">{formatDay(poll.date)}</span>{poll.covers ? ` · ${poll.covers}` : ""}</li>)}
              </ol>
            )}
          </>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-[#c8dbcc] bg-[repeating-linear-gradient(135deg,#eef3ed_0_6px,#f8faf7_6px_12px)] p-5 text-sm leading-6 text-[#576c60]">
            <strong className="text-[#19372d]">Schedule not announced yet.</strong> {election.termEndsOn ? `The current house's term ends in ${formatDay(election.termEndsOn)}. ` : ""}The Election Commission usually announces dates four to six weeks before polling. This page will show them once they are announced.
          </p>
        )}
        {election.note && <p className="mt-4 text-sm leading-6 text-[#576c60]">{election.note}</p>}
      </section>

      {results ? <Results election={election} results={results} /> : status === "counted" && (
        <section className="mt-8 rounded-2xl border border-dashed border-[#c8dbcc] bg-[#f9fbf8] p-5 text-sm leading-6 text-[#576c60]">
          <strong className="text-[#19372d]">Results not collected on this site yet.</strong>{" "}
          {election.resultsUrl ? <a href={election.resultsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1d6547] underline">See them on the ECI results site ↗</a> : "They are on the Election Commission's results site."}
        </section>
      )}
      <Sources election={election} />
    </div>
  );
}
