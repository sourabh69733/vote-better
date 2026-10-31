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
        {election.polls.map((poll) => <li key={poll.date}>{formatDay(poll.date)}{poll.covers ? <span className="text-[#7a8c7e]"> · {poll.covers}</span> : null}</li>)}
      </ul>
    )]);
  }
  if (election.countingOn) rows.push(["Counting", formatDay(election.countingOn)]);
  if (election.termEndsOn) rows.push([election.polls.length ? "Term ended" : "Current term ends", formatDay(election.termEndsOn)]);
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-[#7a8c7e]">{label}</dt>
          <dd className="font-medium text-[#19372d]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ElectionCard({ election, today }: { election: Election; today: string }) {
  const status = electionStatus(election, today);
  const live = status === "polling" || status === "counting";
  return (
    <article className={`rounded-[22px] border bg-white p-5 sm:p-6 ${live ? "border-[#2a7658] shadow-[0_12px_36px_rgba(28,64,40,.10)]" : "border-[#dce6dc]"}`} aria-labelledby={`${election.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#4c8063]">{BODY_LABEL[election.body]} · {election.states.join(", ")}</p>
          <h3 id={`${election.id}-title`} className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#18372b]"><Link href={`/elections/${election.id}`} className="hover:underline">{election.name}</Link></h3>
          {election.seats ? <p className="mt-0.5 text-sm text-[#738276]">{election.seats} {election.seats === 1 ? "seat" : "seats"}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${live ? "bg-[#1c6047] text-white" : status === "announced" ? "bg-[#e0f0e3] text-[#216146]" : "bg-[#eef3ed] text-[#526a59]"}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <Dates election={election} />
      {election.note ? <p className="mt-4 text-sm leading-6 text-[#576c60]">{election.note}</p> : null}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {election.siteHref ? <Link href={election.siteHref} className="font-semibold text-[#1d6547] underline underline-offset-4">Every seat&apos;s result →</Link> : <Link href={`/elections/${election.id}`} className="font-semibold text-[#1d6547] underline underline-offset-4">Details →</Link>}
        {election.resultsUrl ? <a href={election.resultsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1d6547] underline underline-offset-4">ECI results page ↗</a> : null}
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-[#526a59]">Sources ({election.sources.length})</summary>
        <ul className="mt-2 space-y-2">
          {election.sources.map((source) => (
            <li key={source.url + source.title} className="text-[#576c60]">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[#1d6547] underline underline-offset-4">{source.title}</a>
              <span className="block text-xs text-[#7a8c7e]">{source.publisher} · checked {formatDay(source.checkedOn)}</span>
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
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#528166]">{eyebrow}</p>
        <h2 id={`${id}-heading`} className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#19372d]">{title}</h2>
        <p className="mt-3 max-w-xs text-sm leading-6 text-[#66796d]">{lead}</p>
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
      <header className="border-b border-[#d9e3da] pb-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2a7658]">Election calendar{checked ? ` · checked ${formatDay(checked)}` : ""}</p>
        <h1 className="mt-3 text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-[#19372d]">What is being voted on</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#576c60]">
          Voting for the first time? <Link href="/share/first-time-voter" className="font-semibold text-[#1d6547] underline underline-offset-4">Share the three steps</Link>. Elections underway now, the ones due next, and the ones counted recently. Every date comes from an Election Commission of India press note; dates ECI has not announced are left blank.
        </p>
      </header>

      <Section id="now" eyebrow="01 / Now" title="Underway" lead="Polling or counting today, or announced with a schedule.">
        {groups.now.length ? groups.now.map((election) => <ElectionCard key={election.id} election={election} today={today} />) : (
          <p className="rounded-[22px] border border-dashed border-[#c8dbcc] bg-[#f9fbf8] p-6 text-sm leading-6 text-[#576c60]">
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
