import { formatDay, type Election } from "@/lib/elections";

const DAY = 86_400_000;
const time = (day: string) => Date.parse(`${day}T00:00:00Z`);

// The schedule on one line: announcement, each polling day, counting, and today when it falls inside.
export default function ScheduleTimeline({ election, today }: { election: Election; today: string }) {
  const first = election.announcedOn ?? election.polls[0]?.date;
  const last = election.countingOn ?? election.polls.at(-1)?.date;
  if (!first || !last) return null;
  const [x0, x1] = [14, 406];
  const span = Math.max(time(last) - time(first), DAY);
  const x = (day: string) => x0 + ((time(day) - time(first)) / span) * (x1 - x0);
  const showToday = today >= first && today <= last;
  const pollStart = election.polls[0]?.date;
  const pollEnd = election.polls.at(-1)?.date;
  const label = `${election.announcedOn ? `Announced ${formatDay(election.announcedOn)}. ` : ""}${election.polls.length} polling ${election.polls.length === 1 ? "day" : "days"}${pollStart ? ` from ${formatDay(pollStart)}` : ""}${pollEnd && pollEnd !== pollStart ? ` to ${formatDay(pollEnd)}` : ""}.${election.countingOn ? ` Counted ${formatDay(election.countingOn)}.` : ""}`;

  return (
    <figure className="m-0">
      <svg viewBox="0 0 420 96" className="h-auto w-full max-w-[600px]" role="img" aria-label={label}>
        <line x1={x0} y1={48} x2={x1} y2={48} stroke="#b9cbbd" strokeWidth={2} />
        {pollStart && pollEnd && <line x1={x(pollStart)} y1={48} x2={x(pollEnd)} y2={48} stroke="#1e6b4d" strokeWidth={4} strokeLinecap="round" />}
        {election.announcedOn && (
          <g>
            <circle cx={x(election.announcedOn)} cy={48} r={6} fill="#fff" stroke="#1e6b4d" strokeWidth={2} />
            <text x={x(election.announcedOn)} y={24} fontSize={12} fill="#66796d">Announced</text>
            <text x={x(election.announcedOn)} y={78} fontSize={12} fill="#19372d" fontWeight={600}>{formatDay(election.announcedOn)}</text>
          </g>
        )}
        {election.polls.map((poll) => <circle key={poll.date} cx={x(poll.date)} cy={48} r={5} fill="#1e6b4d" stroke="#fff" strokeWidth={1.5}><title>{`${poll.covers ? `${poll.covers}: ` : ""}${formatDay(poll.date)}`}</title></circle>)}
        {pollStart && (
          <text x={(x(pollStart) + x(pollEnd ?? pollStart)) / 2} y={24} fontSize={12} fill="#66796d" textAnchor="middle">
            {election.polls.length} polling {election.polls.length === 1 ? "day" : "days"}
          </text>
        )}
        {election.countingOn && (
          <g>
            <circle cx={x(election.countingOn)} cy={48} r={7} fill="#5b3f8f" />
            <text x={x(election.countingOn)} y={24} fontSize={12} fill="#5b3f8f" textAnchor="end" fontWeight={700}>Counting</text>
            <text x={x(election.countingOn)} y={78} fontSize={12} fill="#19372d" textAnchor="end" fontWeight={600}>{formatDay(election.countingOn)}</text>
          </g>
        )}
        {showToday && (
          <g>
            <line x1={x(today)} y1={34} x2={x(today)} y2={62} stroke="#5b3f8f" strokeWidth={2} strokeDasharray="3 3" />
            <text x={x(today)} y={92} fontSize={11} fill="#5b3f8f" textAnchor="middle" fontWeight={700}>Today</text>
          </g>
        )}
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
