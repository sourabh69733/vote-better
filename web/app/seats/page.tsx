import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow } from "@/components/ui";
import { candidateHref, ELECTION_INFO, ordinal, requireResults, RESULT_ELECTIONS, searchSeats, seatHref, seatWinner, statesOf, yearOf, type SeatMatch } from "@/lib/results";
import { partyColor } from "@/lib/party-colors";

export const metadata: Metadata = {
  title: "Find your seat | Vote Better",
  description: "Every Lok Sabha seat in 2024, 2019 and 2014, and every Rajasthan assembly seat in 2023: who won, everyone who contested, and the official ECI source.",
};

interface PageProps { searchParams: Promise<{ q?: string | string[] }> }

const party = (id: (typeof RESULT_ELECTIONS)[number], code: string) => requireResults(id).parties[code]?.name ?? code;

function MatchRow({ match }: { match: SeatMatch }) {
  const winner = seatWinner(match.seat);
  // Group matched people by name so "won in 2019 and 2014" reads as one line.
  const people = new Map<string, { party: string; years: string[]; won: boolean; first?: SeatMatch["people"][number] }>();
  for (const person of match.people) {
    const entry = people.get(person.candidate.name) ?? { party: person.candidate.party, years: [], won: false, first: person };
    entry.years.push(`${yearOf(person.id)} (${person.candidate.rank === 1 ? "won" : ordinal(person.candidate.rank)})`);
    entry.won ||= person.candidate.rank === 1;
    people.set(person.candidate.name, entry);
  }
  return (
    <li className="rounded-2xl border border-line-soft bg-surface p-4 sm:p-5">
      <Link href={seatHref(match.seat, match.id)} className="group flex items-start gap-3">
        <span className="mt-1 h-9 w-1.5 shrink-0 rounded-full" style={{ background: partyColor(winner?.party) }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink group-hover:underline">{match.seat.name} <span className="text-sm font-normal text-subtle">· {ELECTION_INFO[match.id].seatLabel} · {match.seat.state}</span></span>
          {winner && <span className="mt-0.5 block truncate text-sm text-body">{yearOf(match.id)}: {winner.name}, {party(match.id, winner.party)}{winner.how === "unopposed" ? " (unopposed)" : ""}</span>}
        </span>
      </Link>
      {[...people].map(([name, entry]) => (
        <p key={name} className="mt-2 pl-[18px] text-xs font-semibold text-link">
          Matched: {entry.first && entry.first.id === "lok-sabha-2024" ? <Link href={candidateHref(match.seat, entry.first.candidate)} className="underline">{name}</Link> : name} ({entry.party}), {entry.years.join(", ")}
        </p>
      ))}
      <p className="mt-3 flex flex-wrap gap-2 pl-[18px]">
        {match.years.map((id) => (
          <Link key={id} href={seatHref(match.seat, id)} className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-bold text-link hover:bg-tint">{ELECTION_INFO[id].label}</Link>
        ))}
      </p>
    </li>
  );
}

export default async function SeatsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const latest = requireResults("lok-sabha-2024");
  const matches = query ? searchSeats(query) : [];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <header className="border-b border-line pb-8">
        <Eyebrow>Lok Sabha 2024, 2019, 2014 · Rajasthan Assembly 2023</Eyebrow>
        <h1 className="mt-3 text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-ink">Find your seat</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-body">Search your constituency, your state, or the name of anyone who contested in the last three Lok Sabha elections or the 2023 Rajasthan assembly election. Every result comes from the Election Commission of India.</p>
        <form action="/seats" method="get" className="mt-6 flex max-w-2xl gap-2" role="search">
          <label htmlFor="seat-search" className="sr-only">Search seats, states or candidates</label>
          <input id="seat-search" name="q" defaultValue={query} placeholder="e.g. Jaipur, Kerala or a candidate's name" autoComplete="off"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-4 text-base text-ink focus:border-link focus:outline-none focus:ring-4 focus:ring-link/10" />
          <button type="submit" className="min-h-12 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong">Search</button>
        </form>
      </header>

      {query ? (
        <section className="mt-8" aria-live="polite">
          <p className="text-sm text-muted">{matches.length ? `${matches.length} ${matches.length === 1 ? "seat matches" : "seats match"} "${query}"` : `No seat, state or candidate matches "${query}". Check the spelling or try part of the name.`}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {matches.map((match) => <MatchRow key={`${match.seat.stateSlug}/${match.seat.slug}`} match={match} />)}
          </ul>
        </section>
      ) : (
        <section className="mt-8 grid gap-3" aria-label="2024 seats by state">
          <p className="text-sm text-muted">Browse 2024 by state, or open <Link href="/elections/lok-sabha-2019" className="font-semibold text-link underline">2019</Link> and <Link href="/elections/lok-sabha-2014" className="font-semibold text-link underline">2014</Link>.</p>
          {statesOf(latest).map((state) => (
            <details key={state.stateSlug} className="group rounded-[20px] border border-line bg-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 font-semibold text-ink">
                <span>{state.state} <span className="ml-2 text-sm font-normal text-subtle">{state.seats.length} {state.seats.length === 1 ? "seat" : "seats"}</span></span>
                <span className="text-subtle transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <ul className="grid gap-2 border-t border-track p-3 sm:grid-cols-2">
                {state.seats.map((seat) => {
                  const winner = seatWinner(seat);
                  return (
                    <li key={seat.slug}>
                      <Link href={seatHref(seat)} className="group flex items-center justify-between gap-4 rounded-2xl border border-line-soft bg-surface p-4 hover:border-line-strong sm:p-5">
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink group-hover:underline">{seat.name}</span>
                          {winner && <span className="mt-0.5 block truncate text-sm text-body">{winner.name}, {party("lok-sabha-2024", winner.party)}{winner.how === "unopposed" ? " (unopposed)" : ""}</span>}
                        </span>
                        <span className="shrink-0 text-subtle" aria-hidden="true">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
