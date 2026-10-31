import { BODY_LABEL, type Election } from "../elections";
import { ELECTION_INFO, electionTotals, findSeat, formatNumber, formatShort, isResultElection, loadResults, type ResultElectionId, seatWinner } from "../results";
import { partyColor } from "../party-colors";

export interface Preview { kicker: string; title: string; line: string; stat?: string; statLabel?: string; color?: string }

export function seatPreview(id: ResultElectionId, stateSlug: string, seatSlug: string): Preview | null {
  const results = loadResults(id);
  const seat = findSeat(id, stateSlug, seatSlug);
  const winner = seat && seatWinner(seat);
  if (!results || !seat || !winner) return null;
  const party = results.parties[winner.party]?.name ?? winner.party;
  return {
    kicker: ELECTION_INFO[id].body === "lok-sabha" ? `${ELECTION_INFO[id].label.toUpperCase()} · ${seat.state.toUpperCase()}` : ELECTION_INFO[id].label.toUpperCase(),
    title: seat.name,
    line: `${winner.name}, ${party}${winner.how === "unopposed" ? ", elected unopposed" : ""}`,
    ...(winner.margin !== null ? { stat: formatNumber(winner.margin), statLabel: "votes, winning margin" } : {}),
    color: partyColor(winner.party),
  };
}

export function electionPreview(election: Election): Preview {
  const results = isResultElection(election.id) ? loadResults(election.id) : undefined;
  if (results) {
    const totals = electionTotals(results);
    return {
      kicker: `${BODY_LABEL[election.body].toUpperCase()} · ${results.seats.length} SEATS`, title: election.name,
      line: totals.closest ? `Closest seat: ${totals.closest.seat.name}, ${formatNumber(totals.closest.margin)} votes. Find yours.` : "Every seat's result.",
      ...(totals.turnout !== null ? { stat: `${totals.turnout.toFixed(1)}%`, statLabel: "turnout" } : {}),
    };
  }
  return {
    kicker: BODY_LABEL[election.body].toUpperCase(), title: election.name,
    line: election.polls.length ? `${election.polls.length} polling ${election.polls.length === 1 ? "day" : "days"}. Dates from the Election Commission.` : "Schedule not announced yet.",
    ...(election.seats ? { stat: formatShort(election.seats), statLabel: "seats" } : {}),
  };
}
