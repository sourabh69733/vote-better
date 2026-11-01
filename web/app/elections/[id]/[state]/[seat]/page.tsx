import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import NominationSeat from "@/components/election/NominationSeat";
import SeatResult from "@/components/election/SeatResult";
import StoryLauncher from "@/components/story/StoryLauncher";
import { ButtonLink } from "@/components/ui";
import { findNominationSeat, loadNominations, nominationElectionIds } from "@/lib/nominations";
import { ELECTION_INFO, findSeat, isResultElection, loadResults, RESULT_ELECTIONS, seatHref, seatWinner } from "@/lib/results";
import { resolveDeck } from "@/lib/share/decks";
import { elections } from "@/records/elections";

interface PageProps { params: Promise<{ id: string; state: string; seat: string }> }

// 2024 seats have their own pages under /seats; this route serves the older elections, and
// the candidate lists of elections whose results are not on the site yet.
export function generateStaticParams() {
  return [
    ...RESULT_ELECTIONS.filter((id) => id !== "lok-sabha-2024").flatMap((id) =>
      (loadResults(id)?.seats ?? []).map((seat) => ({ id, state: seat.stateSlug, seat: seat.slug }))),
    ...nominationElectionIds().filter((id) => !(isResultElection(id) && loadResults(id))).flatMap((id) =>
      loadNominations(id)!.seats.map((seat) => ({ id, state: seat.stateSlug, seat: seat.slug }))),
  ];
}

// The candidate list stands in for a seat until the election's results are published here.
function nominationSeat(id: string, state: string, slug: string) {
  const election = elections.find((item) => item.id === id);
  const nominations = loadNominations(id);
  const seat = findNominationSeat(id, state, slug);
  if (!election || !nominations || !seat || (isResultElection(id) && loadResults(id))) return undefined;
  return { election, nominations, seat };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, state, seat: slug } = await params;
  const listed = nominationSeat(id, state, slug);
  if (listed) {
    return {
      title: `${listed.seat.name}, ${listed.seat.state}: candidates | Vote Better`,
      description: `Who is on the ballot in ${listed.seat.name} for the ${listed.election.name}, with each candidate's party and the official ECI source.`,
    };
  }
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
  const listed = nominationSeat(id, state, slug);
  if (listed) return <NominationSeat {...listed} />;
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
