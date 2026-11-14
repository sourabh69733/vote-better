import Link from "next/link";
import type { ReactNode } from "react";
import { BODY_LABEL, STATUS_LABEL, electionStatus, formatDay, groupElections, todayIso, type Election } from "@/lib/elections";
import { pinLookupAvailable } from "@/lib/my-area";
import { partyColor } from "@/lib/party-colors";
import { electionTotals, formatNumber, previousResult, requireResults, seatHref } from "@/lib/results";
import { elections } from "@/records/elections";

export const revalidate = 3600;

// The home page speaks to every voter in India, most of whom first meet Vote Better through a shared story.
// So it leads with story-shaped facts. Area pages such as Jaipur are reached through search, not listed here.

const LEARN = [
  { kicker: "First-time voter", title: "Voting for the first time?", text: "Three steps, from getting on the roll to poll day.", href: "/share/first-time-voter", tone: "bg-you text-white" },
  { kicker: "Explained", title: "What does an MP actually do?", text: "Four jobs, straight from the Constitution.", href: "/share/mp-role", tone: "bg-brand text-white" },
  { kicker: "Constitution", title: "Who does what in government", text: "Union, state and local, and how a bill becomes law.", href: "/constitution", tone: "bg-story text-white" },
  { kicker: "Quests", title: "Five small things to try", text: "Find your MLA, read a result, check a source yourself.", href: "/quests", tone: "bg-pop text-ink" },
];

const TRY = ["Varanasi", "Jaipur", "Wayanad", "Mumbai North West"];

const PROMISES = [
  { title: "Every fact has a source", text: "Tap any number to see the official record it came from.", icon: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1m-1 9a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" },
  { title: "Same fields for everyone", text: "Every candidate is shown the same way, whatever their party.", icon: "M4 6h16M4 12h16M4 18h16" },
  { title: "No scores, no ratings", text: "We show what the records say. Deciding is your call.", icon: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zm-3 9l2 2 4-4" },
];

function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-xs font-extrabold uppercase tracking-[0.16em] ${light ? "text-pop" : "text-eyebrow"}`}>{children}</p>;
}

// A phone-shaped card in the style of an Instagram story, with the segment bar along the top.
function StoryCard({ children, className = "", label, href }: { children: ReactNode; className?: string; label: string; href?: string }) {
  const body = (
    <>
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => <span key={index} className={`h-[3px] flex-1 rounded-full ${index === 0 ? "bg-white" : "bg-white/30"}`} />)}
      </div>
      <div className="mt-3 flex items-center gap-2" aria-hidden="true">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[11px] font-black text-story">✓</span>
        <span className="text-[11px] font-bold text-white/80">votebetter</span>
      </div>
      {children}
    </>
  );
  const shape = `flex aspect-[9/16] w-[220px] flex-col rounded-[28px] bg-story p-4 text-white shadow-[0_24px_60px_rgba(16,48,38,.28)] ring-1 ring-white/10 sm:w-[240px] ${className}`;
  return href
    ? <Link href={href} aria-label={label} className={`${shape} transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand`}>{body}</Link>
    : <div aria-label={label} role="img" className={shape}>{body}</div>;
}

function Ring({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 42;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="10" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-pop)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(percent / 100) * circumference} ${circumference}`} />
    </svg>
  );
}

// The seats each party won last time, as one bar, so a reader sees at a glance who holds the house.
function LastTime({ election }: { election: Election }) {
  const last = previousResult(election);
  if (!last) return null;
  const total = last.results.seats.length;
  const top = last.parties.slice(0, 3);
  const others = total - top.reduce((sum, party) => sum + party.seats, 0);
  const year = last.election.countingOn?.slice(0, 4);
  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">Last time, {year}</p>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-track" role="img"
        aria-label={`${year}: ${top.map((party) => `${party.code} ${party.seats}`).join(", ")}${others ? `, others ${others}` : ""} of ${total} seats`}>
        {top.map((party) => <span key={party.code} className="h-full origin-left animate-[growX_.9s_ease-out_both] motion-reduce:animate-none" style={{ width: `${(party.seats / total) * 100}%`, background: partyColor(party.code) }} />)}
      </div>
      <p className="mt-1.5 text-sm text-body">
        <span className="font-semibold text-ink">{top[0].code} {top[0].seats}</span> of {total}
        {top[1] ? <span className="text-muted"> · {top[1].code} {top[1].seats}</span> : null}
      </p>
    </div>
  );
}

function ElectionTile({ election, today }: { election: Election; today: string }) {
  const status = electionStatus(election, today);
  const live = status === "polling" || status === "counting";
  const when = election.polls.length ? `Polling from ${formatDay(election.polls[0].date)}`
    : election.termEndsOn ? `Term ends ${formatDay(election.termEndsOn)}` : null;
  return (
    <Link href={`/elections/${election.id}`} className={`group flex flex-col rounded-[22px] border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_30px_rgba(28,64,40,.08)] ${live ? "border-you" : "border-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-eyebrow">{BODY_LABEL[election.body]}</p>
        {status !== "due" && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${live ? "bg-you text-white" : "bg-you-soft text-you"}`}>{STATUS_LABEL[status]}</span>}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink group-hover:underline">{election.states.join(", ")}</p>
      <p className="text-sm text-muted">{election.seats ? `${election.seats} seats` : null}{election.seats && when ? " · " : null}{when}</p>
      <LastTime election={election} />
    </Link>
  );
}

export default function Home() {
  const today = todayIso();
  const groups = groupElections(elections, today);
  const next = [...groups.now, ...groups.upcoming].slice(0, 5);
  const results = requireResults("lok-sabha-2024");
  const totals = electionTotals(results);
  const electors = results.seats.reduce((sum, seat) => sum + (seat.electors ?? 0), 0);
  const pin = pinLookupAvailable();

  const closest = totals.closest;
  const closestWinner = closest?.seat.candidates[0];
  const nextYear = next[0] && (next[0].polls[0]?.date ?? next[0].termEndsOn)?.slice(0, 4);
  const sameYear = next.filter((election) => (election.polls[0]?.date ?? election.termEndsOn)?.startsWith(nextYear ?? "-"));
  const chip = sameYear.length > 1 && sameYear.every((election) => election.body === "assembly")
    ? `${sameYear.length} states vote in ${nextYear}` : next[0] ? `Next up: ${next[0].states.join(", ")}` : null;

  const numbers = [
    { value: formatNumber(results.seats.length), label: "seats" },
    { value: formatNumber(totals.candidates), label: "candidates" },
    ...(totals.turnout !== null ? [{ value: `${totals.turnout.toFixed(1)}%`, label: "turnout" }] : []),
    ...(totals.widest ? [{ value: (totals.widest.margin / 1e5).toFixed(1), unit: "lakh", label: `votes, the biggest win (${totals.widest.seat.name})`, href: seatHref(totals.widest.seat) }] : []),
  ];

  return (
    <div className="overflow-x-clip">
      {/* Hero: what the site is for, the search, and a stack of real facts shaped like the stories people share. */}
      <section className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(198,241,106,.35),transparent_65%)]" />
          <div className="absolute -right-32 top-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(106,63,209,.14),transparent_65%)]" />
        </div>
        <div className="mx-auto grid w-full max-w-[1320px] gap-12 px-4 pb-14 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] lg:items-center lg:px-8 lg:pb-20">
          <div>
            {chip && (
              <Link href={next[0] ? `/elections/${next[0].id}` : "/elections"} className="inline-flex items-center gap-2 rounded-full border border-you/20 bg-you-soft px-3 py-1.5 text-sm font-semibold text-you hover:border-you/40">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-you opacity-50 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-you" />
                </span>
                {chip} <span aria-hidden="true">→</span>
              </Link>
            )}
            <h1 className="mt-6 max-w-3xl text-[clamp(2.75rem,6.2vw,5.4rem)] font-bold leading-[0.98] tracking-[-0.03em] text-ink">
              Know who you&apos;re{" "}
              <span className="relative whitespace-nowrap text-brand">
                <span className="absolute inset-x-0 bottom-[0.08em] -z-10 h-[0.32em] rounded-sm bg-pop" aria-hidden="true" />
                voting for.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-body">
              Who won your seat, what they did in Parliament, and who is on the ballot next. Every fact links to its official source.
            </p>

            {/* One box: a six-digit PIN goes on to the my-area page, anything else searches seats and people. */}
            <form action="/seats" method="get" role="search" className="mt-8 max-w-xl">
              <label htmlFor="home-seat-search" className="sr-only">{pin ? "Find your MP and MLA" : "Find your MP and everyone who contested"}</label>
              <div className="flex gap-2 rounded-[20px] border border-line-strong bg-surface p-2 shadow-[0_16px_40px_rgba(28,64,40,.10)] focus-within:border-link focus-within:ring-4 focus-within:ring-eyebrow/10">
                <input id="home-seat-search" name="q" placeholder={pin ? "PIN, seat or name" : "Seat, state or name"} autoComplete="off"
                  className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-ink placeholder:text-subtle focus:outline-none" />
                <button type="submit" className="min-h-12 rounded-[14px] bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-strong">Find my MP</button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Try</span>
              {TRY.map((name) => (
                <Link key={name} href={`/seats?q=${encodeURIComponent(name)}`} className="rounded-full border border-line bg-surface px-3 py-1 font-semibold text-body transition hover:border-line-strong hover:text-ink">{name}</Link>
              ))}
              <Link href="/seats" className="px-1 font-semibold text-link underline underline-offset-4">or browse by state</Link>
            </div>
            {pin && <p className="mt-3 text-xs text-subtle">PIN codes work for Rajasthan, as a preview.</p>}
          </div>

          <div className="relative mx-auto flex h-[400px] w-full max-w-[480px] items-center justify-center sm:h-[470px]" aria-label="Facts from the 2024 Lok Sabha election">
            {totals.turnout !== null && (
              <StoryCard label={`Lok Sabha 2024 turnout: ${totals.turnout.toFixed(1)} percent`} className="absolute right-0 top-0 hidden rotate-[6deg] sm:flex">
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-pop">Lok Sabha 2024</p>
                <p className="mt-1 text-lg font-semibold leading-tight">How many came out to vote</p>
                <div className="relative mt-5 grid place-items-center">
                  <Ring percent={totals.turnout} />
                  <span className="absolute text-2xl font-semibold tabular-nums">{totals.turnout.toFixed(1)}%</span>
                </div>
                <p className="mt-auto text-xs text-white/60">of {(electors / 1e7).toFixed(1)} crore voters. Source: ECI</p>
              </StoryCard>
            )}
            {closest && closestWinner && (
              <StoryCard href={seatHref(closest.seat)} label={`Closest fight of 2024: ${closest.seat.name}, won by ${closest.margin} votes. Open the seat.`}
                className="relative -rotate-[4deg] sm:absolute sm:bottom-0 sm:left-0">
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-pop">Closest fight of 2024</p>
                <p className="font-display mt-3 text-[5.5rem] font-bold leading-none tracking-[-0.035em] tabular-nums">{formatNumber(closest.margin)}</p>
                <p className="text-xl font-semibold">votes</p>
                <p className="mt-2 text-sm leading-snug text-white/75">decided {closest.seat.name}, out of {formatNumber(closest.seat.votesPolled ?? 0)} cast.</p>
                <p className="mt-auto flex items-center gap-2 text-xs text-white/80">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: partyColor(closestWinner.party) }} aria-hidden="true" />
                  <span className="truncate">{closestWinner.name} won</span>
                </p>
                <p className="mt-2 text-[11px] text-white/50">Source: ECI · Tap to see the seat</p>
              </StoryCard>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        {next.length > 0 && (
          <section aria-labelledby="next-heading" className="py-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Eyebrow>Elections</Eyebrow>
                <h2 id="next-heading" className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">Up next</h2>
              </div>
              <Link href="/elections" className="text-sm font-semibold text-link underline underline-offset-4">Full calendar →</Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {next.map((election) => <ElectionTile key={election.id} election={election} today={today} />)}
            </div>
            <p className="mt-3 text-xs text-subtle">Dates come from Election Commission press notes.</p>
          </section>
        )}

        <section aria-labelledby="numbers-heading" className="relative overflow-hidden rounded-[28px] bg-story px-6 py-10 text-white sm:px-10 sm:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(198,241,106,.16),transparent_65%)]" />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow light>Lok Sabha 2024</Eyebrow>
              <h2 id="numbers-heading" className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">The last general election, in four numbers</h2>
            </div>
            <Link href="/elections/lok-sabha-2024" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-story transition hover:bg-pop">Explore every seat →</Link>
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
            {numbers.map((item) => (
              <div key={item.label} className="border-l-2 border-pop/40 pl-4">
                <dd className="font-display whitespace-nowrap text-4xl font-semibold tabular-nums tracking-[-0.025em] sm:text-5xl">
                  {item.value}{"unit" in item && <span className="ml-1.5 text-base font-semibold tracking-normal text-white/80 sm:text-lg">{item.unit}</span>}
                </dd>
                <dt className="mt-1 text-sm text-white/70">
                  {"href" in item && item.href ? <Link href={item.href} className="underline decoration-white/30 underline-offset-4 hover:decoration-white">{item.label}</Link> : item.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="learn-heading" className="py-14">
          <Eyebrow>Learn</Eyebrow>
          <h2 id="learn-heading" className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">60-second reads</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted">Short, made to share with a friend who is voting for the first time.</p>
          {/* Swipes sideways on a phone, like a carousel; a grid on wider screens. */}
          <div className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {LEARN.map((card, index) => (
              <Link key={card.href} href={card.href} className={`group relative flex min-h-[260px] w-[72%] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] p-5 transition hover:-translate-y-1 sm:w-auto ${card.tone}`}>
                <span aria-hidden="true" className="font-display absolute -right-3 -top-6 text-[7rem] font-bold leading-none tracking-[-0.035em] opacity-10">{String(index + 1).padStart(2, "0")}</span>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-70">{card.kicker}</p>
                <p className="font-display mt-auto text-2xl font-semibold leading-tight tracking-[-0.03em]">{card.title}</p>
                <p className="mt-2 text-sm leading-6 opacity-80">{card.text}</p>
                <p className="mt-4 text-sm font-bold">Read <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span></p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="How Vote Better handles records" className="mb-14 grid gap-6 border-t border-line pt-10 sm:grid-cols-3">
          {PROMISES.map((promise) => (
            <div key={promise.title} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint text-brand" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={promise.icon} /></svg>
              </span>
              <div>
                <p className="font-semibold text-ink">{promise.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{promise.text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
