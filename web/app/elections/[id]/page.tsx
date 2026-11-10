import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import MarginStrip from "@/components/election/MarginStrip";
import { NominationSeats } from "@/components/election/NominationSeat";
import ScheduleTimeline from "@/components/election/ScheduleTimeline";
import SeatFilter from "@/components/election/SeatFilter";
import { Breadcrumb, Eyebrow, NotCollected } from "@/components/ui";
import { BODY_LABEL, STATUS_LABEL, electionStatus, formatDay, todayIso, type Election } from "@/lib/elections";
import { seatHref, electionTotals, formatNumber, formatShort, isResultElection, loadResults, type ElectionResults, marginsInState, previousResult, seatWinner, statesOf } from "@/lib/results";
import { loadNominations } from "@/lib/nominations";
import { partyColor } from "@/lib/party-colors";
import { elections } from "@/records/elections";
import { heldByeElections } from "@/records/held-bye-elections";

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
    <details className="mt-6 rounded-[20px] border border-line bg-white p-5 text-sm">
      <summary className="cursor-pointer font-semibold text-link">Sources for these dates ({election.sources.length})</summary>
      <ul className="mt-3 space-y-2">
        {election.sources.map((source) => (
          <li key={source.url + source.title} className="text-body">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-4">{source.title}</a>
            <span className="block text-xs text-subtle">{source.publisher} · checked {formatDay(source.checkedOn)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

// For an election not yet held: who won the last one, so a voter can see what is at stake.
function LastTime({ election }: { election: Election }) {
  const last = previousResult(election);
  if (!last) return null;
  // The four biggest by seats, plus any party with a tenth of the vote, so a big vote with few seats shows.
  const top = last.parties.filter((party, index) => (index < 4 && party.seats > 0) || (party.share ?? 0) >= 10);
  const others = last.parties.filter((party) => !top.includes(party));
  const rest = others.reduce((sum, party) => sum + party.seats, 0);
  const restShare = others.reduce((sum, party) => sum + (party.share ?? 0), 0);
  const share = (value: number | null) => (value === null ? "" : `${value.toFixed(1)}%`);
  const href = last.election.siteHref ?? `/elections/${last.election.id}`;
  return (
    <section className="mt-8 rounded-[24px] border border-line bg-white p-5 sm:p-7" aria-labelledby="last-time-heading">
      <h2 id="last-time-heading" className="text-lg font-semibold tracking-[-0.02em] text-ink">Last time</h2>
      <p className="mt-1 text-sm text-muted">Seats won and share of the vote in {last.election.name.replace(/^General Election to /, "the ")}, counted {formatDay(last.election.countingOn!)}.</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {top.map((party) => (
          <li key={party.code} className="flex items-center gap-3 rounded-2xl border border-line-soft p-3">
            <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: partyColor(party.code) }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm text-body">{party.name}</span>
            <span className="text-right">
              <span className="block font-semibold tabular-nums text-ink">{party.seats} {party.seats === 1 ? "seat" : "seats"}</span>
              <span className="block text-xs tabular-nums text-muted">{share(party.share)} of votes</span>
            </span>
          </li>
        ))}
        {others.length > 0 && (
          <li className="flex items-center gap-3 rounded-2xl border border-line-soft p-3 text-sm text-body">
            <span className="flex-1">Others</span>
            <span className="text-right">
              <span className="block font-semibold tabular-nums text-ink">{rest} {rest === 1 ? "seat" : "seats"}</span>
              <span className="block text-xs tabular-nums text-muted">{share(restShare)} of votes</span>
            </span>
          </li>
        )}
      </ul>
      <p className="mt-3 text-xs text-subtle">Vote share counts NOTA in the total, as ECI&apos;s party report does.</p>
      <p className="mt-4 text-sm"><Link href={href} className="font-semibold text-link underline underline-offset-4">Every seat&apos;s result, with its ECI source</Link></p>
    </section>
  );
}

const monthYear = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

// Before a poll: who won each seat last time, grouped by Lok Sabha seat so a voter finds their area fast.
// Seats that held a bye-election since are marked: their results are not on the site, so the MLA may differ.
function LastWinners({ election }: { election: Election }) {
  const last = previousResult(election);
  if (!last) return null;
  const year = last.election.countingOn!.slice(0, 4);
  const held = heldByeElections.filter((item) => election.states.includes(item.state) && item.countedOn > last.election.countingOn!)
    .sort((a, b) => a.countedOn.localeCompare(b.countedOn));
  const heldAt = new Map(held.map((item) => [`${item.state}/${item.seat}`, item]));
  const notices = [...new Map(held.map((item) => [item.source.title, item.source])).values()];
  const groups = new Map<string, { name: string; seats: typeof last.results.seats }>();
  for (const seat of last.results.seats) {
    const key = seat.parliament?.slug ?? seat.stateSlug;
    if (!groups.has(key)) groups.set(key, { name: seat.parliament?.name ?? seat.state, seats: [] });
    groups.get(key)!.seats.push(seat);
  }
  const ordered = [...groups.values()].sort((a, b) => (a.seats[0].number ?? 0) - (b.seats[0].number ?? 0));
  return (
    <section className="mt-8" aria-labelledby="winners-heading">
      <h2 id="winners-heading" className="text-2xl font-semibold tracking-[-0.025em] text-ink">Who won each seat in {year}</h2>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-muted">
        {ordered.length > 1 ? "Grouped by Lok Sabha seat. " : ""}Tap a seat for every candidate and the votes.
        {held.length > 0
          ? <> <span className="font-semibold text-you">{held.length} {held.length === 1 ? "seat has" : "seats have"} voted again</span> in a bye-election since {year}, so the MLA there may have changed. {held.length === 1 ? "It is" : "They are"} marked below. ECI has taken down those results, so they are not on this site yet.</>
          : null}
      </p>
      <SeatFilter target="winner-list" placeholder={`Type a seat, area or name, e.g. ${ordered[0].name}`} />
      <div id="winner-list" className="mt-4 grid gap-3">
        {ordered.map((group) => (
          <details key={group.name} data-state-group className="group rounded-[20px] border border-line bg-white">
            <summary className="cursor-pointer list-none px-5 py-4">
              <span className="flex items-center justify-between gap-4 font-semibold text-ink">
                <span>
                  {group.name} <span className="ml-2 text-sm font-normal text-subtle">{group.seats.length} {group.seats.length === 1 ? "seat" : "seats"}</span>
                  {(() => {
                    const count = group.seats.filter((seat) => heldAt.has(`${seat.state}/${seat.number}`)).length;
                    return count ? <span className="ml-2 rounded-full bg-you-soft px-2 py-0.5 text-xs font-semibold text-you">{count} bye-election{count === 1 ? "" : "s"}</span> : null;
                  })()}
                </span>
                <span className="text-subtle transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
              </span>
              <span className="mt-2 flex h-2 max-w-xs overflow-hidden rounded-full bg-track" aria-hidden="true">
                {group.seats.map((seat) => <span key={seat.slug} className="h-full flex-1 border-r-2 border-white last:border-r-0" style={{ background: partyColor(seatWinner(seat)?.party) }} />)}
              </span>
            </summary>
            <ul className="grid gap-2 p-3 sm:grid-cols-2">
              {group.seats.map((seat) => {
                const winner = seatWinner(seat);
                const again = heldAt.get(`${seat.state}/${seat.number}`);
                return (
                  <li key={seat.slug} data-search={`${seat.name} ${group.name} ${winner?.name ?? ""} ${winner ? last.results.parties[winner.party]?.name ?? winner.party : ""} ${winner?.party ?? ""} ${again ? "bye-election" : ""}`.toLocaleLowerCase("en-IN")}>
                    <Link href={seatHref(seat, last.results.election.id)} className={`group/seat flex items-center gap-3 rounded-2xl border p-4 hover:border-line-strong ${again ? "border-you/30 bg-you-soft/40" : "border-line-soft"}`}>
                      <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: partyColor(winner?.party) }} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink group-hover/seat:underline">{seat.name}</span>
                        <span className="block truncate text-sm text-body">{winner ? `${again ? `${year}: ` : ""}${winner.name}, ${winner.party}` : "No result"}</span>
                        {again && <span className="mt-1 block text-xs font-semibold text-you">Bye-election, counted {monthYear(again.countedOn)}. MLA may have changed.</span>}
                      </span>
                      <span className="shrink-0 text-right text-xs text-muted">
                        {winner?.margin !== null && winner?.margin !== undefined ? <>by <span className="font-semibold tabular-nums text-ink">{formatShort(winner.margin)}</span></> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
      {notices.length > 0 && (
        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer font-semibold text-link">{notices.length === 1 ? "The ECI notice that called this bye-election" : `The ${notices.length} ECI notices that called these bye-elections`}</summary>
          <ul className="mt-2 grid gap-1 pl-4">
            {notices.map((notice) => <li key={notice.title} className="list-disc"><a href={notice.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{notice.title} ↗</a></li>)}
          </ul>
        </details>
      )}
    </section>
  );
}

function Results({ election, results }: { election: Election; results: ElectionResults }) {
  const totals = electionTotals(results);
  const party = (code: string) => results.parties[code]?.name ?? code;
  const states = statesOf(results);
  return (
    <>
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line-soft sm:grid-cols-4">
        {[
          ["Seats", formatNumber(results.seats.length)],
          ["Candidates", formatNumber(totals.candidates)],
          ["Turnout", totals.turnout === null ? "Not stated" : `${totals.turnout.toFixed(1)}%`],
          ["Closest seat", totals.closest ? `${totals.closest.seat.name}, ${formatNumber(totals.closest.margin)}` : "Not stated"],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface-soft p-4 sm:p-5">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {results.source.note && <p className="mt-3 text-sm text-muted">{results.source.note}</p>}

      <section className="mt-10" aria-labelledby="seats-heading">
        <h2 id="seats-heading" className="text-2xl font-semibold tracking-[-0.025em] text-ink">Every seat</h2>
        <p className="mt-1 mb-5 text-sm text-muted">Grouped by state. The line under each state shows how close its seats were: each dot is a seat, further right is a wider win.</p>
        <SeatFilter target="seat-list" placeholder="Type a seat, state or winner, e.g. Jaipur" />
        <div id="seat-list" className="mt-4 grid gap-3">
          {states.map((state) => {
            const dots = marginsInState(results, state.stateSlug).map(({ seat, margin }) => ({ key: seat.slug, name: seat.name, margin, href: seatHref(seat, results.election.id) }));
            return (
              <details key={state.stateSlug} data-state-group className="group rounded-[20px] border border-line bg-white">
                <summary className="cursor-pointer list-none px-5 py-4">
                  <span className="flex items-center justify-between gap-4 font-semibold text-ink">
                    <span>{state.state} <span className="ml-2 text-sm font-normal text-subtle">{state.seats.length} {state.seats.length === 1 ? "seat" : "seats"}</span></span>
                    <span className="text-subtle transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                  </span>
                  {dots.length > 1 && <span className="mt-2 block max-w-xl"><MarginStrip dots={dots} state={state.state} compact /></span>}
                </summary>
                {dots.length >= 3 && (
                  <p className="border-t border-track px-5 pt-3 text-sm">
                    <Link href={`/share/closest/${results.election.id}/${state.stateSlug}`} className="font-semibold text-link underline underline-offset-4">Share the closest fights in {state.state}</Link>
                  </p>
                )}
                <ul className="grid gap-2 p-3 sm:grid-cols-2">
                  {state.seats.map((seat) => {
                    const winner = seatWinner(seat);
                    return (
                      <li key={seat.slug} data-search={`${seat.name} ${seat.state} ${winner?.name ?? ""} ${winner ? party(winner.party) : ""}`.toLocaleLowerCase("en-IN")}>
                        <Link href={seatHref(seat, results.election.id)} className="group/seat flex items-center gap-3 rounded-2xl border border-line-soft p-4 hover:border-line-strong">
                          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: partyColor(winner?.party) }} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink group-hover/seat:underline">{seat.name}</span>
                            <span className="block truncate text-sm text-body">{winner ? `${winner.name}, ${winner.party}` : "No result"}</span>
                          </span>
                          <span className="shrink-0 text-right text-xs text-muted">
                            {winner?.how === "unopposed" ? "Unopposed" : winner?.margin !== null && winner?.margin !== undefined ? <>by <span className="font-semibold tabular-nums text-ink">{formatShort(winner.margin)}</span></> : null}
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
      <p className="mt-6 text-xs leading-5 text-subtle">
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
  const nominations = results ? undefined : loadNominations(election.id);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <Breadcrumb items={[{ href: "/elections", label: "Elections" }]} />
      <header className="mt-6">
        <Eyebrow>{BODY_LABEL[election.body]} · {election.states.join(", ")}</Eyebrow>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">{election.name}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "polling" || status === "counting" ? "bg-brand text-white" : "bg-track text-body"}`}>{STATUS_LABEL[status]}</span>
          {election.seats ? <span>{formatNumber(election.seats)} {election.seats === 1 ? "seat" : "seats"}</span> : null}
        </p>
      </header>

      <section className="mt-8 rounded-[24px] border border-line bg-white p-5 sm:p-7" aria-labelledby="schedule-heading">
        <h2 id="schedule-heading" className="text-lg font-semibold tracking-[-0.02em] text-ink">Schedule</h2>
        {election.polls.length ? (
          <>
            <div className="mt-4"><ScheduleTimeline election={election} today={today} /></div>
            {election.polls.length > 1 && (
              <ol className="mt-4 grid gap-x-6 gap-y-1 text-sm text-body sm:grid-cols-3">
                {election.polls.map((poll) => <li key={poll.date}><span className="font-semibold text-ink">{formatDay(poll.date)}</span>{poll.covers ? ` · ${poll.covers}` : ""}</li>)}
              </ol>
            )}
          </>
        ) : (
          <NotCollected title="Schedule not announced yet." className="mt-3">
            {election.termEndsOn ? `The current house's term ends in ${formatDay(election.termEndsOn)}. ` : ""}The Election Commission usually announces dates four to six weeks before polling. This page will show them once they are announced.
          </NotCollected>
        )}
        {election.note && <p className="mt-4 text-sm leading-6 text-body">{election.note}</p>}
      </section>

      {!results && status !== "counted" && <LastTime election={election} />}
      {nominations && <NominationSeats electionId={election.id} nominations={nominations} />}
      {!results && !nominations && status !== "counted" && <LastWinners election={election} />}
      {results ? <Results election={election} results={results} /> : status === "counted" && (
        <NotCollected title="Results not collected on this site yet." className="mt-8">
          {election.resultsUrl ? <a href={election.resultsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-link underline">See them on the ECI results site ↗</a> : "They are on the Election Commission's results site."}
        </NotCollected>
      )}
      <Sources election={election} />
    </div>
  );
}
