import Link from "next/link";

import { Breadcrumb, Eyebrow, NotCollected, SectionHeading } from "@/components/ui";
import { BODY_LABEL, electionStatus, formatDay, todayIso, type Election } from "@/lib/elections";
import { CANDIDATE_STATUS, candidateGroups, nominationSeatHref, type NominationCandidate, type NominationSeat as Seat, type Nominations } from "@/lib/nominations";
import { partyColor } from "@/lib/party-colors";

const KIND_LABEL: Record<Seat["kind"], string> = { assembly: "Assembly seat", "lok-sabha": "Lok Sabha seat" };

function BallotCard({ candidate }: { candidate: NominationCandidate }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-line-soft bg-surface p-4 sm:p-5">
      <span className="w-1.5 shrink-0 rounded-full" style={{ background: partyColor(candidate.party) }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Ballot no. {candidate.ballot}</p>
        <p className="mt-1 text-lg font-semibold leading-snug tracking-[-0.02em] text-ink">{candidate.name}</p>
        <p className="mt-0.5 text-sm text-body">{candidate.party}</p>
        {candidate.nominations > 1 && <p className="mt-2 text-xs text-muted">{candidate.nominations} nomination papers filed</p>}
      </div>
    </li>
  );
}

function OtherRow({ candidate }: { candidate: NominationCandidate }) {
  const status = CANDIDATE_STATUS[candidate.status];
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{candidate.name}</span>
        <span className="block truncate text-sm text-body">{candidate.party}</span>
      </span>
      <span className="shrink-0 rounded-full bg-track px-3 py-1 text-xs font-bold text-body" title={status.meaning}>{status.label}</span>
    </li>
  );
}

// One seat's candidates while a poll is on: who is on the ballot, who is still being checked, and who is out.
export default function NominationSeat({ election, nominations, seat }: { election: Election; nominations: Nominations; seat: Seat }) {
  const { ballot, pending, out } = candidateGroups(seat);
  const { papers } = seat;
  const status = electionStatus(election, todayIso());
  const voted = status === "counting" || status === "counted";
  const days = election.polls.map((poll) => formatDay(poll.date)).join(", ");
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <Breadcrumb items={[{ href: "/elections", label: "Elections" }, { href: `/elections/${election.id}`, label: election.name }]} />

      <header className="mt-6">
        <Eyebrow>{BODY_LABEL[election.body]} · {KIND_LABEL[seat.kind]} {seat.number} · {seat.state}</Eyebrow>
        <h1 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.07em] text-ink">{seat.name}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-body">
          <strong className="text-ink">
            {ballot.length ? `${ballot.length} ${ballot.length === 1 ? "candidate" : "candidates"} ${voted ? (ballot.length === 1 ? "was" : "were") : (ballot.length === 1 ? "is" : "are")} on the ballot.` : "No candidate is on the ballot yet."}
          </strong>{" "}
          {papers.all} nomination papers were filed: {papers.accepted} accepted, {papers.rejected} rejected and {papers.withdrawn} withdrawn. One person can file up to four papers.
        </p>
        {election.polls.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            {voted ? `Voted on ${days}. Results are not on this site yet. ` : `Polling on ${days}.`}
            {voted && election.resultsUrl && <a href={election.resultsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-link underline">See the result on ECI ↗</a>}
          </p>
        )}
      </header>

      {ballot.length > 0 && (
        <section className="mt-8" aria-labelledby="ballot-heading">
          <SectionHeading id="ballot-heading" title="On the ballot" lead="In ballot order, the order on the voting machine. Set by law: recognised parties first, then other registered parties, then independents." />
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ballot.map((candidate) => <BallotCard key={`${candidate.sourceName}/${candidate.party}`} candidate={candidate} />)}
          </ol>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mt-8" aria-labelledby="pending-heading">
          <SectionHeading id="pending-heading" title="Still being checked" lead="Their nominations are filed or accepted, but the final list is not out yet." />
          <ul className="mt-4 divide-y divide-line-soft rounded-2xl border border-line-soft bg-surface">
            {pending.map((candidate) => <OtherRow key={`${candidate.sourceName}/${candidate.party}`} candidate={candidate} />)}
          </ul>
        </section>
      )}

      <NotCollected title="Age, education, assets and criminal cases are not shown yet." className="mt-8">
        They come from each candidate&apos;s sworn affidavit. This site will add them once each affidavit has been checked by hand.
        Until then, <a href={seat.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-link underline">read the affidavits on ECI&apos;s portal ↗</a>
      </NotCollected>

      {out.length > 0 && (
        <details className="mt-8 rounded-2xl border border-line bg-surface">
          <summary className="cursor-pointer px-5 py-4 font-semibold text-ink">Not on the ballot ({out.length})</summary>
          <ul className="divide-y divide-line-soft border-t border-line-soft">
            {out.map((candidate) => <OtherRow key={`${candidate.sourceName}/${candidate.party}`} candidate={candidate} />)}
          </ul>
        </details>
      )}

      <details className="mt-4 rounded-2xl border border-line bg-surface text-sm">
        <summary className="cursor-pointer px-5 py-4 font-semibold text-ink">What these words mean</summary>
        <dl className="grid gap-3 border-t border-line-soft px-5 py-4">
          {Object.values(CANDIDATE_STATUS).map((status) => (
            <div key={status.label}><dt className="font-semibold text-ink">{status.label}</dt><dd className="text-body">{status.meaning}</dd></div>
          ))}
        </dl>
      </details>

      <p className="mt-8 text-xs leading-5 text-subtle">
        From the <a href={seat.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{nominations.source.publisher}&apos;s {nominations.source.title.toLowerCase()}, {seat.sourceName} ↗</a>.
        List last changed on this site on {formatDay(nominations.changedOn)}. {nominations.source.disclaimer}
      </p>
      <p className="mt-2 text-sm"><Link href={`/elections/${election.id}`} className="font-semibold text-link underline underline-offset-4">Other seats in this election</Link></p>
    </div>
  );
}

// The seats in an election that have candidate lists, for the election page.
export function NominationSeats({ electionId, nominations }: { electionId: string; nominations: Nominations }) {
  return (
    <section className="mt-8" aria-labelledby="candidates-heading">
      <SectionHeading id="candidates-heading" title="Candidates" lead={`Who filed nominations in each seat, and who is on the ballot. From ECI, last changed here on ${formatDay(nominations.changedOn)}.`} />
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {nominations.seats.map((seat) => {
          const { ballot } = candidateGroups(seat);
          return (
            <li key={`${seat.stateSlug}/${seat.slug}`}>
              <Link href={nominationSeatHref(electionId, seat)} className="group flex items-center justify-between gap-3 rounded-2xl border border-line-soft bg-surface p-4 hover:border-line-strong">
                <span className="min-w-0">
                  <span className="block font-semibold text-ink group-hover:underline">{seat.name}</span>
                  <span className="block truncate text-sm text-body">{KIND_LABEL[seat.kind]}, {seat.state}</span>
                </span>
                <span className="shrink-0 text-right text-sm text-muted">
                  <span className="block text-lg font-semibold tabular-nums text-ink">{ballot.length}</span>on the ballot
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
