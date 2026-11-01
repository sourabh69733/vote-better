import Link from "next/link";
import { BODY_LABEL, STATUS_LABEL, electionStatus, formatDay, groupElections, todayIso, type Election } from "@/lib/elections";
import { pinLookupAvailable } from "@/lib/my-area";
import { electionTotals, formatNumber, requireResults, seatHref } from "@/lib/results";
import { elections } from "@/records/elections";

export const revalidate = 3600;

// The home page speaks to every voter in India. Area pages such as Jaipur are reached through search, not listed here.

const LEARN = [
  { kicker: "First-time voter", title: "Voting for the first time?", text: "Three steps, from getting on the roll to poll day.", href: "/share/first-time-voter" },
  { kicker: "Explained", title: "What does an MP actually do?", text: "Four jobs, straight from the Constitution.", href: "/share/mp-role" },
  { kicker: "Constitution", title: "Who does what", text: "Union, state and local government, and how a bill becomes law.", href: "/constitution" },
  { kicker: "Quests", title: "Five small things to try", text: "Find your MLA, read a result, check a source yourself.", href: "/quests" },
];

function Section({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-line py-12 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12" aria-labelledby={`${id}-heading`}>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eyebrow">{eyebrow}</p>
        <h2 id={`${id}-heading`} className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink">{title}</h2>
        <p className="mt-3 max-w-xs text-sm leading-6 text-muted">{lead}</p>
      </div>
      {children}
    </section>
  );
}

function ElectionTile({ election, today }: { election: Election; today: string }) {
  const status = electionStatus(election, today);
  const live = status === "polling" || status === "counting";
  const when = election.polls.length ? `Polling from ${formatDay(election.polls[0].date)}`
    : election.termEndsOn ? `Term ends ${formatDay(election.termEndsOn)}` : null;
  return (
    <Link href={`/elections/${election.id}`} className={`group flex flex-col rounded-[20px] border bg-surface p-5 hover:border-line-strong ${live ? "border-eyebrow" : "border-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-eyebrow">{BODY_LABEL[election.body]}</p>
        {/* A due election says so in its term-end line; only announced or live ones get a badge. */}
        {status !== "due" && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${live ? "bg-brand text-white" : "bg-track text-body"}`}>{STATUS_LABEL[status]}</span>}
      </div>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-ink group-hover:underline">{election.states.join(", ")}</p>
      <p className="mt-auto pt-2 text-sm text-muted">
        {election.seats ? `${election.seats} seats` : null}{election.seats && when ? " · " : null}{when}
      </p>
    </Link>
  );
}

export default function Home() {
  const today = todayIso();
  const groups = groupElections(elections, today);
  const next = [...groups.now, ...groups.upcoming].slice(0, 4);
  const results = requireResults("lok-sabha-2024");
  const totals = electionTotals(results);
  const pin = pinLookupAvailable();

  const stats = [
    { label: "Seats", value: formatNumber(results.seats.length) },
    { label: "Candidates", value: formatNumber(totals.candidates) },
    ...(totals.turnout !== null ? [{ label: "Turnout", value: `${totals.turnout.toFixed(1)}%` }] : []),
  ];
  const fights = [
    totals.closest && { label: "Closest fight", ...totals.closest },
    totals.widest && { label: "Widest win", ...totals.widest },
  ].filter((fight) => !!fight);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 pb-14 pt-10 sm:px-6 sm:pt-16 lg:px-8">
      <header className="grid gap-7 border-b border-line pb-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.9fr)] lg:items-end lg:gap-16 lg:pb-16">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-eyebrow">Civic information, made clear</p>
          <h1 className="mt-5 max-w-4xl text-[clamp(2.7rem,5vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.075em] text-ink">
            Know who <span className="block text-[#43896a]">represents you.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-body">Who won your seat, what they have done since, and which election is next. Every fact links to its official source.</p>
        </div>
        {/* One box: a six-digit PIN goes on to the my-area page, anything else searches seats and people. */}
        <form action="/seats" method="get" role="search" className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_12px_36px_rgba(28,64,40,.07)] lg:mb-2">
          <label htmlFor="home-seat-search" className="text-sm font-bold text-ink">{pin ? "Find your MP and MLA" : "Find your MP and everyone who contested"}</label>
          <div className="mt-3 flex gap-2">
            <input id="home-seat-search" name="q" placeholder={pin ? "PIN, seat or name" : "Your seat, state or a name"} autoComplete="off"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-4 text-base text-ink focus:border-link focus:outline-none focus:ring-4 focus:ring-eyebrow/10" />
            <button type="submit" className="min-h-12 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong">Search</button>
          </div>
          <p className="mt-3 text-sm text-muted">
            Try your constituency, like &ldquo;Varanasi&rdquo;, or a name{pin ? ". PIN codes work for Rajasthan, as a preview" : ""}. Or <Link href="/seats" className="font-semibold text-link underline underline-offset-4">browse by state</Link>.
          </p>
        </form>
      </header>

      <Section id="next" eyebrow="01 / Elections" title="What's next" lead={<>Dates come from Election Commission press notes. <Link href="/elections" className="font-semibold text-link underline underline-offset-4">Full calendar</Link></>}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {next.map((election) => <ElectionTile key={election.id} election={election} today={today} />)}
        </div>
      </Section>

      <Section id="lok-sabha" eyebrow="02 / Results" title="Lok Sabha 2024" lead="Every seat, every candidate and the winning margin, from ECI's official results.">
        <div className="grid gap-3">
          <dl className="grid grid-cols-3 gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-[13px] text-muted">{stat.label}</dt>
                <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-ink sm:text-3xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-3 sm:grid-cols-2">
            {fights.map((fight) => (
              <Link key={fight.label} href={seatHref(fight.seat)} className="group rounded-[20px] border border-line bg-surface p-5 hover:border-line-strong">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-eyebrow">{fight.label}</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-ink group-hover:underline">{fight.seat.name}, {fight.seat.state}</p>
                <p className="text-sm text-muted">Won by {formatNumber(fight.margin)} {fight.margin === 1 ? "vote" : "votes"}</p>
              </Link>
            ))}
          </div>
          <p className="text-sm">
            <Link href="/elections/lok-sabha-2024" className="font-semibold text-link underline underline-offset-4">Open the 2024 results →</Link>
          </p>
        </div>
      </Section>

      <Section id="learn" eyebrow="03 / Learn" title="In a minute" lead="Short reads made to share with friends who vote for the first time.">
        <div className="grid gap-3 sm:grid-cols-2">
          {LEARN.map((card) => (
            <Link key={card.href} href={card.href} className="group rounded-[20px] border border-line bg-surface p-5 hover:border-line-strong">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-eyebrow">{card.kicker}</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-ink group-hover:underline">{card.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{card.text}</p>
            </Link>
          ))}
        </div>
      </Section>

      <section className="mt-12 grid gap-6 rounded-[24px] bg-story px-6 py-7 text-white sm:grid-cols-3 sm:gap-8 sm:px-8" aria-label="How Vote Better handles records">
        <div><span className="text-xs font-bold text-[#9fd5b3]">01</span><p className="mt-2 text-sm font-semibold">Every fact has a source</p></div>
        <div><span className="text-xs font-bold text-[#9fd5b3]">02</span><p className="mt-2 text-sm font-semibold">Same fields for every candidate</p></div>
        <div><span className="text-xs font-bold text-[#9fd5b3]">03</span><p className="mt-2 text-sm font-semibold">Unverified facts stay out</p></div>
      </section>
    </div>
  );
}
