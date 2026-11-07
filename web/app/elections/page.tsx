import type { Metadata } from "next";
import Link from "next/link";

import { BODY_LABEL, STATUS_LABEL, electionStatus, formatDay, groupElections, lastCheckedOn, todayIso, type Election } from "@/lib/elections";
import { elections } from "@/records/elections";

export const metadata: Metadata = {
  title: "Elections: live, upcoming and recent | Vote Better",
  description: "Which elections are being held now, which are due, and which were counted recently, with every date linked to the Election Commission's press note.",
};

export const revalidate = 3600;

function Dates({ election }: { election: Election }) {
  const rows: [string, React.ReactNode][] = [];
  if (election.announcedOn) rows.push(["Announced", formatDay(election.announcedOn)]);
  if (election.polls.length === 1) rows.push(["Polling", formatDay(election.polls[0].date)]);
  if (election.polls.length > 1) {
    rows.push(["Polling", (
      <ul key="polls" className="space-y-0.5">
        {election.polls.map((poll) => <li key={poll.date}>{formatDay(poll.date)}{poll.covers ? <span className="text-subtle"> · {poll.covers}</span> : null}</li>)}
      </ul>
    )]);
  }
  if (election.countingOn) rows.push(["Counting", formatDay(election.countingOn)]);
  if (election.termEndsOn) rows.push([election.polls.length ? "Term ended" : "Current term ends", formatDay(election.termEndsOn)]);
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-subtle">{label}</dt>
          <dd className="font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ElectionCard({ election, today }: { election: Election; today: string }) {
  const status = electionStatus(election, today);
  const live = status === "polling" || status === "counting";
  return (
    <article className={`rounded-[22px] border bg-white p-5 sm:p-6 ${live ? "border-eyebrow shadow-[0_12px_36px_rgba(28,64,40,.10)]" : "border-line"}`} aria-labelledby={`${election.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-eyebrow">{BODY_LABEL[election.body]} · {election.states.join(", ")}</p>
          <h3 id={`${election.id}-title`} className="mt-1 text-xl font-semibold tracking-[-0.03em] text-ink"><Link href={`/elections/${election.id}`} className="hover:underline">{election.name}</Link></h3>
          {election.seats ? <p className="mt-0.5 text-sm text-muted">{election.seats} {election.seats === 1 ? "seat" : "seats"}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${live ? "bg-brand text-white" : status === "announced" ? "bg-tint text-link" : "bg-track text-body"}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <Dates election={election} />
      {election.note ? <p className="mt-4 text-sm leading-6 text-body">{election.note}</p> : null}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {election.siteHref ? <Link href={election.siteHref} className="font-semibold text-link underline underline-offset-4">Every seat&apos;s result →</Link> : <Link href={`/elections/${election.id}`} className="font-semibold text-link underline underline-offset-4">Details →</Link>}
        {election.resultsUrl ? <a href={election.resultsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-link underline underline-offset-4">ECI results page ↗</a> : null}
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-body">Sources ({election.sources.length})</summary>
        <ul className="mt-2 space-y-2">
          {election.sources.map((source) => (
            <li key={source.url + source.title} className="text-body">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-4">{source.title}</a>
              <span className="block text-xs text-subtle">{source.publisher} · checked {formatDay(source.checkedOn)}</span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function Section({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 py-10 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12" aria-labelledby={`${id}-heading`}>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eyebrow">{eyebrow}</p>
        <h2 id={`${id}-heading`} className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink">{title}</h2>
        <p className="mt-3 max-w-xs text-sm leading-6 text-muted">{lead}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export default function ElectionsPage() {
  const today = todayIso();
  const groups = groupElections(elections, today);
  const checked = lastCheckedOn(elections);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <header className="border-b border-line pb-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eyebrow">Election calendar{checked ? ` · checked ${formatDay(checked)}` : ""}</p>
        <h1 className="mt-3 text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-ink">What is being voted on</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-body">
          Voting for the first time? <Link href="/share/first-time-voter" className="font-semibold text-link underline underline-offset-4">Share the three steps</Link>. Elections underway now, the ones due next, and the ones counted recently. Every date comes from an Election Commission of India press note; dates ECI has not announced are left blank.
        </p>
      </header>

      <Section id="now" eyebrow="01 / Now" title="Underway" lead="Polling or counting today, or announced with a schedule.">
        {groups.now.length ? groups.now.map((election) => <ElectionCard key={election.id} election={election} today={today} />) : (
          <p className="rounded-[22px] border border-dashed border-line-strong bg-surface-soft p-6 text-sm leading-6 text-body">
            No election is underway on {formatDay(today)}. The Election Commission has not announced the next schedule. The elections due next are listed below.
          </p>
        )}
      </Section>

      <Section id="upcoming" eyebrow="02 / Next" title="Due" lead="Assemblies whose term ends soon. ECI usually announces the schedule four to six weeks before polling.">
        {groups.upcoming.map((election) => <ElectionCard key={election.id} election={election} today={today} />)}
      </Section>

      <Section id="recent" eyebrow="03 / Recent" title="Counted" lead="Latest first. Results on this site are shown where the data has been imported and checked.">
        {groups.recent.map((election) => <ElectionCard key={election.id} election={election} today={today} />)}
      </Section>
    </div>
  );
}
