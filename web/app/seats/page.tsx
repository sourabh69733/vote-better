import type { Metadata } from "next";
import Link from "next/link";
import { candidateHref, loadLokSabha2024, searchSeats, seatHref, type Seat } from "@/lib/lok-sabha-2024";

export const metadata: Metadata = {
  title: "Find your Lok Sabha seat | Vote Better",
  description: "Every 2024 Lok Sabha seat: who won, everyone who contested, and the official ECI source.",
};

interface PageProps { searchParams: Promise<{ q?: string | string[] }> }

function SeatRow({ seat, party, note }: { seat: Seat; party: (code: string) => string; note?: React.ReactNode }) {
  const winner = seat.unopposed ? { name: seat.unopposed.winner, party: seat.unopposed.party } : seat.candidates[0];
  return (
    <Link href={seatHref(seat)} className="group flex items-center justify-between gap-4 rounded-2xl border border-[#e3ebe3] bg-white p-4 hover:border-[#bcd6c3] sm:p-5">
      <div className="min-w-0">
        <p className="font-semibold text-[#19372d] group-hover:underline">{seat.name} <span className="text-sm font-normal text-[#7a8c7e]">· {seat.state}</span></p>
        <p className="mt-0.5 truncate text-sm text-[#5f7465]">{winner.name}, {party(winner.party)}{seat.unopposed ? " (unopposed)" : ""}</p>
        {note}
      </div>
      <span className="shrink-0 text-[#7a8c7e]" aria-hidden="true">→</span>
    </Link>
  );
}

export default async function SeatsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const data = loadLokSabha2024();
  const party = (code: string) => data.parties[code]?.name ?? code;
  const matches = query ? searchSeats(query) : [];
  const firstPerson = matches.find((match) => match.matchedCandidate);
  const states = Object.entries(Object.groupBy(data.seats, (seat) => seat.state)) as [string, Seat[]][];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <header className="border-b border-[#d9e3da] pb-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2a7658]">Lok Sabha 2024 · {data.seats.length} seats</p>
        <h1 className="mt-3 text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-[#19372d]">Find your seat</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#576c60]">Search your constituency, your state, or the name of anyone who contested. Every result comes from the Election Commission of India.</p>
        <form action="/seats" method="get" className="mt-6 flex max-w-2xl gap-2" role="search">
          <label htmlFor="seat-search" className="sr-only">Search seats, states or candidates</label>
          <input id="seat-search" name="q" defaultValue={query} placeholder="e.g. Jaipur, Kerala or a candidate's name" autoComplete="off"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#bfd3c3] bg-white px-4 text-base text-[#18372b] focus:border-[#28724f] focus:outline-none focus:ring-4 focus:ring-[#2a7658]/10" />
          <button type="submit" className="min-h-12 rounded-xl bg-[#1c6047] px-5 text-sm font-bold text-white hover:bg-[#154c38]">Search</button>
        </form>
      </header>

      {query ? (
        <section className="mt-8" aria-live="polite">
          <p className="text-sm text-[#607568]">{matches.length ? `${matches.length} ${matches.length === 1 ? "match" : "matches"} for "${query}"` : `No seat, state or candidate matches "${query}". Check the spelling or try part of the name.`}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {matches.map(({ seat, matchedCandidate }) => (
              <SeatRow key={`${seat.stateSlug}/${seat.slug}`} seat={seat} party={party} note={matchedCandidate && matchedCandidate.rank !== 1 ? (
                <p className="mt-1 text-xs font-semibold text-[#2c6249]">
                  Matched: {matchedCandidate.name} ({matchedCandidate.party}), finished {matchedCandidate.rank}
                </p>
              ) : undefined} />
            ))}
          </div>
          {firstPerson?.matchedCandidate && (
            <p className="mt-4 text-sm text-[#66796d]">Tip: open a seat to see every candidate, or go straight to{" "}
              <Link href={candidateHref(firstPerson.seat, firstPerson.matchedCandidate)} className="font-semibold text-[#1d6547] underline">{firstPerson.matchedCandidate.name}&apos;s profile</Link>.
            </p>
          )}
        </section>
      ) : (
        <section className="mt-8 grid gap-3" aria-label="Seats by state">
          {states.map(([state, seats]) => (
            <details key={state} className="group rounded-[20px] border border-[#dce6dc] bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 font-semibold text-[#19372d]">
                <span>{state} <span className="ml-2 text-sm font-normal text-[#7a8c7e]">{seats.length} {seats.length === 1 ? "seat" : "seats"}</span></span>
                <span className="text-[#7a8c7e] transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <div className="grid gap-2 border-t border-[#eef3ed] p-3 sm:grid-cols-2">
                {seats.map((seat) => <SeatRow key={seat.slug} seat={seat} party={party} />)}
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
