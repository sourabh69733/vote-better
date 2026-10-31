import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import SeatResult from "@/components/election/SeatResult";
import StoryLauncher from "@/components/story/StoryLauncher";
import { ButtonLink } from "@/components/ui";
import { ELECTION_INFO, findSeat, isResultElection, loadResults, RESULT_ELECTIONS, seatHref, seatWinner } from "@/lib/results";
import { resolveDeck } from "@/lib/share/decks";

interface PageProps { params: Promise<{ id: string; state: string; seat: string }> }

// 2024 seats have their own pages under /seats; this route serves the older elections.
export function generateStaticParams() {
  return RESULT_ELECTIONS.filter((id) => id !== "lok-sabha-2024").flatMap((id) =>
    (loadResults(id)?.seats ?? []).map((seat) => ({ id, state: seat.stateSlug, seat: seat.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, state, seat: slug } = await params;
  if (!isResultElection(id)) return { title: "Seat not found" };
  const seat = findSeat(id, state, slug);
  if (!seat) return { title: "Seat not found" };
  const year = id.slice(-4);
  return {
    title: `${seat.name}, ${seat.state}: ${ELECTION_INFO[id].label} result | Vote Better`,
    description: `${seatWinner(seat)?.name ?? "The winner"} won ${seat.name} in ${year}. Every candidate, their votes and the official ECI source.`,
  };
}

export default async function ContestPage({ params }: PageProps) {
  const { id, state, seat: slug } = await params;
  if (!isResultElection(id)) notFound();
  if (id === "lok-sabha-2024") redirect(seatHref({ stateSlug: state, slug }));
  const seat = findSeat(id, state, slug);
  if (!seat) notFound();
  // The seat's share deck plays on the page too: one scene format for both.
  const story = resolveDeck(["seat", id, seat.stateSlug, seat.slug]);
  return (
    <SeatResult
      id={id}
      seat={seat}
      actions={<>
        {story && <StoryLauncher story={story} variant="brand" />}
        <ButtonLink href={`/share/seat/${id}/${seat.stateSlug}/${seat.slug}`}>Share on Instagram</ButtonLink>
      </>}
    />
  );
}
