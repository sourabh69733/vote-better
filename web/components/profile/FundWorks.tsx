import { formatDay } from "@/lib/elections";
import { MILESTONES, type FundWork, type Milestone, type MpFunds } from "@/lib/mp-funds";
import { formatShort } from "@/lib/results";

const panel = "rounded-3xl border border-[#e2e9e2] bg-white p-5 sm:p-6";
const rupees = (value: number) => `₹${formatShort(value)}`;

const BADGE: Record<Milestone, string> = {
  recommended: "bg-[#eef3ed] text-[#3c5a47]",
  sanctioned: "bg-[#fdf1df] text-[#8a5212]",
  completed: "bg-[#2f8a5b] text-white",
};

const BAR: Record<Milestone, string> = { recommended: "#c9d6cb", sanctioned: "#e6a756", completed: "#2f8a5b" };

function Badge({ milestone }: { milestone: Milestone }) {
  const step = MILESTONES.find((item) => item.id === milestone)!;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[milestone]}`} title={step.who}>{step.label}</span>;
}

function WorkItem({ work }: { work: FundWork }) {
  const amount = work.completed?.amount ?? work.sanctioned?.amount ?? work.recommended?.amount;
  const dates = [
    work.recommended && `recommended ${formatDay(work.recommended.on)}`,
    work.sanctioned && `sanctioned ${formatDay(work.sanctioned.on)}`,
    work.completed && `completed ${formatDay(work.completed.on)}`,
  ].filter(Boolean).join(" · ");
  return (
    <li className="border-b border-[#eef3ed] pb-3 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-[#122a20]">{work.activity}</p>
        <Badge milestone={work.milestone} />
      </div>
      <p className="mt-0.5 text-sm text-[#2c4436]">{work.description ?? "Description is in Hindi, which the public dashboard does not send intact."}</p>
      <p className="mt-1 text-xs text-[#6b7f71]">
        {amount !== undefined && <span className="font-semibold tabular-nums text-[#2c4436]">{rupees(amount)}</span>}
        {dates && ` · ${dates}`}
        {work.paid > 0 && ` · ${rupees(work.paid)} paid`}
        {work.stage && ` · portal stage: ${work.stage}`}
      </p>
    </li>
  );
}

// A short version for seat and area pages; the full list stays on the MP's profile.
export function FundSummary({ funds, name, className = "" }: { funds: MpFunds; name: string; className?: string }) {
  return (
    <section className={`rounded-[24px] border border-line bg-surface p-5 sm:p-6 ${className}`} aria-labelledby="fund-summary-heading">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-eyebrow">MP fund (MPLADS)</p>
      <h2 id="fund-summary-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">What {name}&apos;s MP fund is paying for</h2>
      <dl className="mt-4 grid grid-cols-3 gap-4">
        {[
          ["Asked for", String(funds.totals.recommended.count), rupees(funds.totals.recommended.amount)],
          ["Marked done", String(funds.reached.completed), "by the agency"],
          ["Paid out", rupees(funds.paid), `of ${rupees(funds.allocated)}`],
        ].map(([label, value, note]) => (
          <div key={label}>
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="whitespace-nowrap text-xl font-semibold tabular-nums tracking-[-0.03em] text-ink sm:text-2xl">{value}</dd>
            <dd className="text-xs text-subtle">{note}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <a href={`/people/${funds.personId}#funds`} className="font-semibold text-link underline underline-offset-4">See every work and its status →</a>
        <span className="text-xs text-subtle">{funds.source.title} · collected {formatDay(funds.collectedOn)}</span>
      </p>
    </section>
  );
}

// Works paid for from the MP's local area fund, shown as steps: each badge says who acted.
export default function FundWorks({ funds }: { funds: MpFunds }) {
  const total = funds.works.length;
  const [latest, rest] = [funds.works.slice(0, 5), funds.works.slice(5)];
  return (
    <div className="grid gap-3">
      <dl className={`${panel} grid grid-cols-2 gap-4 sm:grid-cols-4`}>
        {[
          ["Fund for this term so far", rupees(funds.allocated), `since ${formatDay(funds.tenureStart)}`],
          ["Asked for", rupees(funds.totals.recommended.amount), `${funds.totals.recommended.count} works`],
          ["Approved", rupees(funds.totals.sanctioned.amount), `${funds.totals.sanctioned.count} works`],
          ["Paid out", rupees(funds.paid), "to agencies and vendors"],
        ].map(([label, value, note]) => (
          <div key={label}>
            <dt className="text-[13px] text-[#6b7f71]">{label}</dt>
            <dd className="text-2xl font-semibold tracking-[-0.03em] text-[#122a20]">{value}</dd>
            <dd className="text-xs text-[#8a9b8e]">{note}</dd>
          </div>
        ))}
      </dl>

      <div className={panel}>
        <p className="text-[13px] font-medium text-[#6b7f71]">How far each of the {total} works has got</p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#edf2ec]" role="img" aria-label={`${funds.reached.recommended} recommended only, ${funds.reached.sanctioned} sanctioned, ${funds.reached.completed} completed`}>
          {(["completed", "sanctioned", "recommended"] as const).map((step) => (
            <span key={step} style={{ flexGrow: funds.reached[step], background: BAR[step] }} />
          ))}
        </div>
        <ol className="mt-4 grid grid-cols-3 gap-3">
          {MILESTONES.map((step) => (
            <li key={step.id} className="text-sm">
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[step.id]}`}>{step.label}</span>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[#122a20]">{funds.reached[step.id]}</p>
              <p className="text-xs text-[#6b7f71]">{step.who}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className={panel}>
        <p className="text-[13px] font-medium text-[#6b7f71]">Latest works</p>
        <ul className="mt-3 grid gap-3">{latest.map((work) => <WorkItem key={work.id} work={work} />)}</ul>
        {rest.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-bold text-[#1d6547]">All {total} works</summary>
            <ul className="mt-3 grid gap-3">{rest.map((work) => <WorkItem key={work.id} work={work} />)}</ul>
          </details>
        )}
      </div>

      <p className="text-xs leading-5 text-[#8a9b8e]">
        From the <a href={funds.source.url} target="_blank" rel="noopener noreferrer" className="underline">{funds.source.title} ↗</a> ({funds.source.publisher}), collected {formatDay(funds.collectedOn)}.
        It holds works entered on eSAKSHI, which began on 1 April 2023. &quot;Completed&quot; means the implementing agency marked the work done; this site has not checked any work on the ground.
      </p>
    </div>
  );
}
