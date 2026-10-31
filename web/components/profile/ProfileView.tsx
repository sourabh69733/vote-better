import Link from "next/link";
import type { ReactNode } from "react";
import { candidateHref, formatShort, type ElectionResults, marginOf, seatHref } from "@/lib/results";
import { partyColor } from "@/lib/party-colors";
import type { ProfileModel, ProfileStat } from "@/lib/profile-model";
import SourceNote from "@/components/election/SourceNote";
import { buildStory } from "@/lib/story";
import StoryLauncher from "@/components/story/StoryLauncher";
import SourceChip from "./SourceChip";
import { Bars, SectionNav, TugOfWar, VoteRace } from "./Visuals";

function initials(name: string) {
  const parts = name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

// Facts render as their real value, never mid-animation.
function Figure({ children }: { children: ReactNode }) {
  return <span className="tabular-nums">{children}</span>;
}

function Ring({ percent, color }: { percent: number; color: string }) {
  const radius = 15.5;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 36 36" className="h-12 w-12 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="18" cy="18" r={radius} fill="none" stroke="#e5ece5" strokeWidth="4" />
      <circle cx="18" cy="18" r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(percent / 100) * circumference} ${circumference}`} />
    </svg>
  );
}

function StatCard({ stat, color }: { stat: ProfileStat; color: string }) {
  const visual = stat.visual;
  return (
    <div className="flex min-w-0 flex-col justify-between rounded-3xl border border-[#e2e9e2] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#6b7f71]">{stat.label}</p>
          <p className="mt-1 text-[1.65rem] font-semibold leading-tight tracking-[-0.03em] text-[#122a20]">{stat.value}</p>
          {stat.note && <p className="mt-0.5 text-xs text-[#6b7f71]">{stat.note}</p>}
        </div>
        {visual?.kind === "ring" && <Ring percent={visual.percent} color={color} />}
      </div>
      {visual?.kind === "split" && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#edf2ec]" aria-hidden="true">
          {visual.parts.map((part) => (
            <span key={part.label} style={{ flexGrow: Math.max(part.value, 1), background: part.tone === "good" ? "#2f8a5b" : "#d9822b" }} />
          ))}
        </div>
      )}
      {stat.source && <div className="mt-3"><SourceChip source={stat.source} /></div>}
    </div>
  );
}

function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-reveal scroll-mt-36 pt-10" aria-labelledby={`${id}-title`}>
      {kicker && <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5b8a6c]">{kicker}</p>}
      <h2 id={`${id}-title`} className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#122a20] sm:text-3xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const panel = "rounded-3xl border border-[#e2e9e2] bg-white p-5 sm:p-6";

export default function ProfileView({ model, data }: { model: ProfileModel; data: ElectionResults }) {
  const color = model.party?.color ?? "#7d8a80";
  const contest = model.contest;
  const margin = contest?.candidate ? marginOf(contest.seat, contest.candidate) : null;
  const sections = [
    ...(contest ? [{ id: "contest", label: "2024 contest" }] : []),
    ...(model.work ? [{ id: "work", label: "Work" }] : []),
    ...(model.money ? [{ id: "money", label: "Money and cases" }] : []),
    ...(model.timeline.length || model.facts.length ? [{ id: "story", label: "Story" }] : []),
    { id: "sources", label: "Sources" },
  ];
  const tug = contest?.seat.candidates.length && contest.seat.candidates.length > 1 ? (() => {
    const [first, second] = contest.seat.candidates;
    const side = (candidate: typeof first) => ({
      name: candidate.name, party: candidate.party, color: partyColor(candidate.party), votes: candidate.votes,
      label: `${formatShort(candidate.votes)} votes`, href: candidateHref(contest.seat, candidate),
    });
    return { left: side(first), right: side(second), focus: contest.candidate?.slug === second.slug ? "right" as const : "left" as const };
  })() : null;

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <nav className="text-sm font-semibold text-[#3c6b4f]" aria-label="Breadcrumb">
        {model.breadcrumb.map((item, index) => (
          <span key={item.href}>
            {index > 0 && <span className="mx-2 text-[#a3b7a7]" aria-hidden="true">/</span>}
            <Link href={item.href} className="hover:underline">{item.label}</Link>
          </span>
        ))}
      </nav>

      <header className="relative mt-4 overflow-hidden rounded-[32px] bg-[#122a20] text-white">
        <div className="h-1.5" style={{ background: color }} aria-hidden="true" />
        <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-10 lg:p-10">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-bold sm:h-20 sm:w-20 sm:text-2xl" style={{ boxShadow: `0 0 0 3px ${color}` }} aria-hidden="true">{initials(model.name)}</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">{model.kicker}</p>
                <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${model.role.tone === "lost" ? "bg-white/15 text-white" : "bg-white text-[#122a20]"}`}>{model.role.label}</span>
              </div>
            </div>
            <h1 className="mt-5 text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.05em]">{model.name}</h1>
            {model.party && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-white/80">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                {model.party.name}{model.party.symbol ? <span className="text-white/55">· symbol: {model.party.symbol}</span> : null}
              </p>
            )}
            <p className="mt-1 text-sm text-white/60">{model.place}</p>
          </div>
          {margin && (
            <div className="md:text-right">
              <p className="text-sm text-white/65">{margin.kind === "won" ? "Won by" : "Lost by"}</p>
              <p className="text-[clamp(2.6rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.05em]">
                <Figure>{formatShort(margin.votes)}</Figure>
              </p>
              <p className="mt-1 text-sm text-white/65">votes {margin.kind === "won" ? "over" : "to"} {margin.other.name}</p>
            </div>
          )}
        </div>
        <div className="relative flex flex-col gap-4 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p className="text-[15px] leading-7 text-white/85">{model.headline}</p>
          <StoryLauncher story={buildStory(model)} className="shrink-0 self-start sm:self-center" />
        </div>
      </header>

      {model.warning && <p className="mt-3 rounded-2xl bg-[#fbf3df] p-3 text-sm text-[#6b5520]">{model.warning}</p>}

      {tug && (
        <div className={`${panel} mt-3`}>
          <TugOfWar {...tug} />
        </div>
      )}

      {model.stats.length > 0 && (
        <div className={`mt-3 grid gap-3 ${model.stats.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : model.stats.length === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2"}`}>
          {model.stats.map((stat) => <StatCard key={stat.id} stat={stat} color={color} />)}
        </div>
      )}

      {model.related.length > 0 && (
        <div className="mt-3 grid gap-2">
          {model.related.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfe0d2] bg-[#eef6ee] px-4 py-3 text-sm font-semibold text-[#1d5b3f] hover:bg-[#e3f0e5]">
              <span>{item.label}</span><span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6"><SectionNav sections={sections} /></div>

      {contest && (
        <Section id="contest" kicker={`${contest.seat.name}, ${contest.seat.state}`} title="How the 2024 vote went">
          <div className={panel}>
            {contest.note && <p className="mb-4 text-sm text-[#4f6455]">{contest.note}</p>}
            {contest.seat.unopposed ? (
              <p className="text-[15px] text-[#2c4436]">Elected unopposed. {contest.seat.unopposed.nominated} filed nominations, {contest.seat.unopposed.rejected} were rejected and {contest.seat.unopposed.withdrawn} withdrew.</p>
            ) : (
              <VoteRace
                nota={contest.seat.notaVotes}
                rows={contest.seat.candidates.map((candidate) => ({
                  key: candidate.slug, name: candidate.name, party: candidate.party, color: partyColor(candidate.party),
                  votes: candidate.votes, share: candidate.shareOfValidVotes, rank: candidate.rank,
                  href: candidateHref(contest.seat, candidate), self: candidate.slug === contest.candidate?.slug,
                }))}
              />
            )}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#eef3ed] pt-4 text-sm font-bold">
              {contest.seat.electors && contest.seat.votesPolled && (
                <span className="font-normal text-[#4f6455]">Turnout {((contest.seat.votesPolled / contest.seat.electors) * 100).toFixed(1)}% of {formatShort(contest.seat.electors)} voters</span>
              )}
              <Link href={seatHref(contest.seat)} className="text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Seat page</Link>
              {contest.candidate && contest.seat.candidates.length > 1 && (
                <Link href={`${seatHref(contest.seat)}/compare?a=${contest.candidate.slug}&b=${(contest.candidate.rank === 1 ? contest.seat.candidates[1] : contest.seat.candidates[0]).slug}`} className="text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Compare side by side</Link>
              )}
            </div>
          </div>
        </Section>
      )}

      {model.work && (
        <Section id="work" kicker="In office" title="What they did in Parliament">
          <div className="grid gap-3 md:grid-cols-2">
            {model.work.questions && (
              <div className={panel}>
                <p className="text-[13px] font-medium text-[#6b7f71]">Questions asked</p>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#122a20]"><Figure>{model.work.questions.total}</Figure></p>
                <div className="mt-4"><Bars data={model.work.questions.bySession} color={color} unit="questions" /></div>
                <p className="mt-3 text-xs text-[#8a9b8e]">Lok Sabha records, collected {model.work.questions.collectedOn}. Tap a bar.</p>
              </div>
            )}
            {model.work.questions && model.work.questions.topMinistries.length > 0 && (
              <div className={panel}>
                <p className="text-[13px] font-medium text-[#6b7f71]">What they asked about most</p>
                <ul className="mt-3 grid gap-2.5">
                  {model.work.questions.topMinistries.map((item) => (
                    <li key={item.name}>
                      <div className="flex justify-between gap-3 text-sm"><span className="truncate text-[#2c4436]">{item.name}</span><span className="tabular-nums text-[#6b7f71]">{item.count}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-[#edf2ec]"><div className="h-full rounded-full" style={{ width: `${(item.count / model.work!.questions!.topMinistries[0].count) * 100}%`, background: color, opacity: 0.8 }} /></div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {model.work.debates && (
              <div className={panel}>
                <p className="text-[13px] font-medium text-[#6b7f71]">Debates and matters raised</p>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[#122a20]"><Figure>{model.work.debates.total}</Figure></p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {model.work.debates.byCategory.map((item) => (
                    <span key={item.name} className="rounded-full bg-[#eef3ed] px-2.5 py-1 text-xs font-semibold text-[#3c5a47]">{item.name} · {item.count}</span>
                  ))}
                </div>
                <ul className="mt-4 grid gap-2 text-sm">
                  {model.work.debates.latest.map((item) => (
                    <li key={item.url + item.date}><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#2c4436] hover:underline"><span className="text-[#8a9b8e]">{item.date} · </span>{item.title}</a></li>
                  ))}
                </ul>
              </div>
            )}
            {model.work.questions && model.work.questions.latest.length > 0 && (
              <div className={panel}>
                <p className="text-[13px] font-medium text-[#6b7f71]">Latest questions</p>
                <ul className="mt-3 grid gap-2.5 text-sm">
                  {model.work.questions.latest.map((item) => (
                    <li key={item.url + item.subject}><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#2c4436] hover:underline"><span className="text-[#8a9b8e]">{item.date} · </span>{item.subject}</a></li>
                  ))}
                </ul>
                <a href={model.work.questions.directoryUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">All questions on Digital Sansad ↗</a>
              </div>
            )}
            {model.work.offices && model.work.offices.map((office) => (
              <div key={office.title + office.detail} className={panel}>
                <p className="text-[13px] font-medium text-[#6b7f71]">{office.current ? "Current office" : "Past office"}</p>
                <p className="mt-1 font-semibold text-[#122a20]">{office.title}</p>
                <p className="text-sm text-[#4f6455]">{office.detail}</p>
                {office.source && <div className="mt-2"><SourceChip source={office.source} /></div>}
              </div>
            ))}
            {model.work.positions && model.work.positions.length > 0 && (
              <details className={`${panel} md:col-span-2`}>
                <summary className="cursor-pointer text-sm font-bold text-[#1d6547]">Committees and positions ({model.work.positions.length})</summary>
                <ol className="mt-3 grid gap-2">
                  {model.work.positions.map((position, index) => (
                    <li key={`${position.title}-${index}`} className="flex flex-col justify-between gap-0.5 border-b border-[#eef3ed] pb-2 text-sm last:border-0 sm:flex-row sm:gap-4">
                      <span className="text-[#2c4436]">{position.title}</span>
                      <span className="shrink-0 text-[#8a9b8e]">{position.period ?? "Date not stated"}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
          {model.work.note && <p className="mt-3 text-sm text-[#6b7f71]">{model.work.note}</p>}
        </Section>
      )}

      {model.money && (
        <Section id="money" kicker={`${model.money.election} affidavit`} title="Money and cases they declared">
          <div className={`${panel} grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]`}>
            <div>
              {model.money.assets !== undefined && (
                <>
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                    <div><p className="text-[13px] text-[#6b7f71]">Assets</p><p className="text-3xl font-semibold tracking-[-0.03em] text-[#122a20]">₹{formatShort(model.money.assets)}</p></div>
                    {model.money.liabilities !== undefined && <div><p className="text-[13px] text-[#6b7f71]">Liabilities</p><p className="text-3xl font-semibold tracking-[-0.03em] text-[#9a5b17]">₹{formatShort(model.money.liabilities)}</p></div>}
                  </div>
                  {model.money.liabilities !== undefined && (
                    <div className="mt-4 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
                      <span style={{ flexGrow: model.money.assets, background: "#2f8a5b" }} />
                      <span style={{ flexGrow: Math.max(model.money.liabilities, 1), background: "#d9822b" }} />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-[#8a9b8e]">Values on the filing date, as declared. Not today&apos;s wealth.</p>
                </>
              )}
            </div>
            <dl className="grid content-start gap-3">
              {model.money.cases !== undefined && <div><dt className="text-[13px] text-[#6b7f71]">Criminal cases declared</dt><dd className="text-3xl font-semibold text-[#122a20]">{model.money.cases}</dd><dd className="text-xs text-[#8a9b8e]">A declared case is not a conviction.</dd></div>}
              {model.money.education && <div><dt className="text-[13px] text-[#6b7f71]">Education declared</dt><dd className="font-semibold text-[#122a20]">{model.money.education}</dd></div>}
              {model.money.age !== undefined && <div><dt className="text-[13px] text-[#6b7f71]">Age at filing</dt><dd className="font-semibold text-[#122a20]">{model.money.age}</dd></div>}
            </dl>
            {model.money.source && <div className="md:col-span-2"><SourceChip source={model.money.source} /></div>}
          </div>
        </Section>
      )}

      {(model.timeline.length > 0 || model.facts.length > 0) && (
        <Section id="story" kicker="Background" title="Their story">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {model.timeline.length > 0 && (
              <div className={panel}>
                <ol className="relative ml-2 border-l-2 border-[#e2e9e2]">
                  {model.timeline.map((item, index) => (
                    <li key={`${item.when}-${index}`} className={`relative pl-6 ${index ? "mt-5" : ""}`}>
                      <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white" style={{ background: item.strong ? color : "#b9cbbd" }} aria-hidden="true" />
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5b8a6c]">{item.when}</p>
                      <p className="mt-0.5 text-[15px] leading-6 text-[#203a2c]">{item.text}</p>
                      {item.source && <div className="mt-1.5"><SourceChip source={item.source} /></div>}
                    </li>
                  ))}
                </ol>
                {model.timelineNote && <p className="mt-5 text-xs text-[#8a9b8e]">{model.timelineNote}</p>}
              </div>
            )}
            {model.facts.length > 0 && (
              <div className={panel}>
                <dl className="grid gap-3">
                  {model.facts.map(([label, value]) => (
                    <div key={label}><dt className="text-[13px] text-[#6b7f71]">{label}</dt><dd className="font-semibold text-[#122a20]">{value}</dd></div>
                  ))}
                </dl>
                {model.links.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {model.links.map((link) => (
                      <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-[#cfe0d2] px-3 text-sm font-semibold text-[#1d5b3f] hover:bg-[#eef6ee]">{link.label} ↗</a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      <Section id="sources" kicker="Check it yourself" title="Sources">
        <div className="grid gap-3">
          {model.sources.length > 0 && (
            <ul className={`${panel} grid gap-2`}>
              {model.sources.map((source) => (
                <li key={source.url + source.title} className="flex flex-col justify-between gap-0.5 border-b border-[#eef3ed] pb-2 text-sm last:border-0 sm:flex-row sm:gap-4">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">{source.title} ↗</a>
                  <span className="shrink-0 text-[#8a9b8e]">Checked {source.checkedOn}</span>
                </li>
              ))}
            </ul>
          )}
          {contest && <SourceNote data={data} rows={contest.candidate?.locator.toLowerCase()} reviewedAt={contest.candidate?.reviewedAt} file={contest.seat.unopposed ? data.references.find((file) => file.title.includes("report 2A")) : undefined} />}
          {model.coming.length > 0 && (
            <p className="text-sm text-[#6b7f71]"><span className="font-semibold text-[#3c5a47]">Coming to this profile:</span> {model.coming.join(", ")}. We add each only after checking the original record.</p>
          )}
        </div>
      </Section>
    </div>
  );
}
