import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import SeatResult from "@/components/election/SeatResult";
import { ButtonLink } from "@/components/ui";
import { listAreaOverviews } from "@/lib/civic-area";
import { candidateHref, findSeat, requireResults, seatWinner } from "@/lib/results";

interface PageProps { params: Promise<{ state: string; seat: string }> }

export function generateStaticParams() {
  return requireResults("lok-sabha-2024").seats.map((seat) => ({ state: seat.stateSlug, seat: seat.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, seat: slug } = await params;
  const seat = findSeat("lok-sabha-2024", state, slug);
  if (!seat) return { title: "Seat not found" };
  return {
    title: `${seat.name}, ${seat.state}: 2024 Lok Sabha result | Vote Better`,
    description: `${seatWinner(seat)?.name ?? "The winner"} won ${seat.name} in 2024. See every candidate, their votes and the official ECI source.`,
  };
}

export default async function SeatPage({ params }: PageProps) {
  const { state, seat: slug } = await params;
  const seat = findSeat("lok-sabha-2024", state, slug);
  if (!seat) notFound();
  const winner = seat.candidates[0];
  // Curated areas add the office holder's work. Match them by seat name and state.
  const curated = listAreaOverviews().find(({ area }) => area.name.toLowerCase() === seat.name.toLowerCase() && area.state === seat.state);

  return (
    <SeatResult
      id="lok-sabha-2024"
      seat={seat}
      actions={<>
        {winner && <ButtonLink href={`${candidateHref(seat, winner)}?story=1`} variant="primary"><span aria-hidden="true">▶</span> Play story</ButtonLink>}
        {winner && <ButtonLink href={candidateHref(seat, winner)}>See profile <span aria-hidden="true">→</span></ButtonLink>}
        <ButtonLink href={`/share/seat/lok-sabha-2024/${seat.stateSlug}/${seat.slug}`}>Share on Instagram</ButtonLink>
      </>}
      aside={curated && (
        <Link href={`/areas/${curated.area.id}`} className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-line-strong bg-tint p-5 text-sm font-semibold text-link hover:bg-track">
          <span>See checked records for {seat.name}: office holder, parliamentary work and filings.</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
    />
  );
}
