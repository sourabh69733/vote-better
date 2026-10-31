import Link from "next/link";

import { seatHref, formatNumber, type ResultElectionId, seatHistory } from "@/lib/lok-sabha";
import { partyColor } from "@/lib/party-colors";

// This seat in every Lok Sabha election on the site, newest first.
export default function SeatHistory({ stateSlug, seatSlug, current }: { stateSlug: string; seatSlug: string; current: ResultElectionId }) {
  const history = seatHistory(stateSlug, seatSlug);
  if (history.length < 2) return null;
  return (
    <section className="mt-8" aria-labelledby="history-heading">
      <h2 id="history-heading" className="text-2xl font-semibold tracking-[-0.04em] text-ink">This seat over the years</h2>
      <p className="mt-1 text-sm text-muted">Matched by state and seat name. Seats that were renamed or redrawn are not linked.</p>
      <ol className="mt-4 grid gap-2">
        {history.map(({ id, year, seat, winner, partyName }) => {
          const here = id === current;
          const body = (
            <div className={`flex items-center gap-4 rounded-2xl border p-4 ${here ? "border-you bg-you-soft" : "border-line-soft bg-white hover:border-line-strong"}`}>
              <span className="w-14 shrink-0 text-lg font-semibold tabular-nums text-ink">{year}</span>
              <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: partyColor(winner.party) }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{winner.name}</span>
                <span className="block truncate text-sm text-body">{partyName}</span>
              </span>
              <span className="shrink-0 text-right text-sm text-body">
                {winner.how === "unopposed" ? "Unopposed" : winner.margin !== null ? <>won by <span className="font-semibold tabular-nums text-ink">{formatNumber(winner.margin)}</span></> : null}
              </span>
            </div>
          );
          return <li key={id}>{here ? <div aria-current="page">{body}</div> : <Link href={seatHref(seat, id)}>{body}</Link>}</li>;
        })}
      </ol>
    </section>
  );
}
