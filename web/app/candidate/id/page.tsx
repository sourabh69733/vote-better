import Link from "next/link";
import { getCandidateById, getAllCandidates } from "@/lib/data";
import { formatCurrency } from "@/lib/translations";
import CriminalCasePill from "@/components/CriminalCasePill";
import WealthChart from "@/components/WealthChart";
import AttendanceDial from "@/components/AttendanceDial";
import FundUtilization from "@/components/FundUtilization";
import ELI5Card from "@/components/ELI5Card";
import SourceLink from "@/components/SourceLink";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const candidates = getAllCandidates();
  return candidates
    .filter((c: { id: string }) => c?.id)
    .map((c: { id: string }) => ({ id: c.id }));
}

export default async function CandidateProfilePage({ params }: PageProps) {
  const { id } = await params;
  const candidate = getCandidateById(id);

  if (!candidate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Candidate Not Found
        </h1>
        <Link href="/" className="text-indigo-600 hover:underline">
          ← Go Home
        </Link>
      </div>
    );
  }

  const perf = candidate.legislative_performance ?? {};
  const fin = candidate.financials ?? {};
  const crime = candidate.criminal_record ?? {};
  const fund = candidate.fund_utilization ?? {};
  const history = candidate.electoral_history ?? [];
  const sources = candidate.data_sources ?? {};

  // Generate text summary
  const summary = generateSummary(candidate);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* ── Section 1: Identity Header ── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0"
            style={{
              backgroundColor: getPartyColor(candidate.party) + "20",
              color: getPartyColor(candidate.party),
            }}
          >
            {candidate.name?.charAt(0)}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {candidate.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: getPartyColor(candidate.party) }}
              >
                {candidate.party}
              </span>
              <span className="text-sm text-slate-500">
                Age {candidate.age} · {candidate.gender}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              📍 {candidate.constituency?.name}, {candidate.constituency?.state}
            </p>
            <p className="text-sm text-slate-500">
              🎓 {candidate.education} · {candidate.terms_served} term
              {candidate.terms_served !== 1 ? "s" : ""} (since{" "}
              {candidate.first_elected})
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 2: Financial Transparency 💰 ── */}
      <section className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          💰 Financial Transparency
        </h2>

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
            <div className="text-xs text-slate-500">Current Assets</div>
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(fin.elections?.at(-1)?.assets ?? 0)}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
            <div className="text-xs text-slate-500">Liabilities</div>
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(fin.elections?.at(-1)?.liabilities ?? 0)}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
            <div className="text-xs text-slate-500">Net Worth</div>
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(
                (fin.elections?.at(-1)?.assets ?? 0) -
                  (fin.elections?.at(-1)?.liabilities ?? 0)
              )}
            </div>
          </div>
        </div>

        {fin.elections && fin.elections.length > 0 && (
          <WealthChart
            elections={fin.elections}
            wealthGrowthPct={fin.wealth_growth_pct ?? 0}
            inflationPct={fin.inflation_pct_same_period ?? 0}
          />
        )}

        <SourceLink url={sources.affidavit_url} label="View Affidavit" />
      </section>

      {/* ── Section 3: Criminal Record ⚖️ ── */}
      <section className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          ⚖️ Criminal Record
        </h2>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <CaseSummaryBadge
            count={crime.total_cases ?? 0}
            label="Total Cases"
          />
          <ConvictedBadge value={crime.convicted} label="Convicted" />
          <ConvictedBadge value={crime.chargesheeted} label="Chargesheeted" />
        </div>

        {/* Case pills */}
        {crime.cases && crime.cases.length > 0 ? (
          <div className="space-y-2">
            {crime.cases.map(
              (
                c: {
                  ipc_section: string;
                  description: string;
                  severity: string;
                  court: string;
                  status: string;
                },
                i: number
              ) => (
                <CriminalCasePill
                  key={i}
                  ipcSection={c.ipc_section}
                  description={c.description}
                  severity={c.severity}
                  court={c.court}
                  status={c.status}
                />
              )
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span>🟢</span>
            <span className="text-sm font-medium text-emerald-700">
              No pending criminal cases
            </span>
          </div>
        )}

        <ELI5Card title="What does a pending case mean?">
          A &quot;pending case&quot; means charges have been filed in court but the court
          hasn&apos;t decided yet. It does NOT mean the person is guilty. India&apos;s courts
          can take years or decades to deliver verdicts. Some cases are political
          in nature (like protest charges), while others are serious criminal
          offenses.
        </ELI5Card>

        <SourceLink url={sources.affidavit_url} label="View Affidavit" />
      </section>

      {/* ── Section 4: Legislative Performance 🏛️ ── */}
      <section className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          🏛️ Legislative Performance
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Attendance dial */}
          <AttendanceDial
            percentage={perf.attendance_pct ?? 0}
            nationalAverage={perf.national_avg_attendance ?? 76}
          />

          {/* Stats grid */}
          <div className="flex-1 grid grid-cols-3 gap-3 w-full">
            <PerfStat
              value={perf.questions_asked ?? 0}
              label="Questions Asked"
              icon="❓"
            />
            <PerfStat
              value={perf.debates_participated ?? 0}
              label="Debates"
              icon="🗣️"
            />
            <PerfStat
              value={perf.bills_introduced ?? 0}
              label="Bills Introduced"
              icon="📜"
            />
          </div>
        </div>

        <ELI5Card title="What does attendance mean?">
          Your MP is supposed to attend Parliament sessions to debate and vote on
          laws that affect you. This percentage shows how often they actually
          showed up. The national average is around 76%.
        </ELI5Card>

        <SourceLink url={sources.prs_url} label="View on PRS" />
      </section>

      {/* ── Section 5: Development Fund 🏗️ ── */}
      <section className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          🏗️ Development Fund (MPLADS)
        </h2>

        <FundUtilization
          releasedCr={fund.total_released_cr ?? 0}
          utilizedCr={fund.total_utilized_cr ?? 0}
          utilizationPct={fund.utilization_pct ?? 0}
          categories={fund.categories ?? {}}
        />

        <SourceLink url={sources.mplads_url} label="View on MPLADS Portal" />
      </section>

      {/* ── Section 6: Electoral History 📊 ── */}
      <section className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          📊 Electoral History
        </h2>

        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map(
              (
                h: {
                  year: number;
                  constituency: string;
                  party: string;
                  result: string;
                  vote_share: number;
                  margin: number;
                  turnout: number;
                  nota_pct: number;
                },
                i: number
              ) => (
                <div
                  key={i}
                  className={`rounded-xl border px-4 py-3 ${
                    h.result === "Won"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">
                        {h.year}
                      </span>
                      <span className="text-sm text-slate-500 ml-2">
                        {h.constituency}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        h.result === "Won"
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {h.result}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-slate-600">
                    <div>
                      Vote Share: <strong>{h.vote_share}%</strong>
                    </div>
                    <div>
                      Margin: <strong>{h.margin}%</strong>
                    </div>
                    <div>
                      Turnout: <strong>{h.turnout}%</strong>
                    </div>
                    <div>
                      NOTA: <strong>{h.nota_pct}%</strong>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            No electoral history available.
          </p>
        )}
      </section>

      {/* ── Section 7: Quick Summary 📋 ── */}
      <section className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          📋 Quick Summary
        </h2>

        <p className="text-slate-700 leading-relaxed">{summary}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/compare/${id}/mp-001`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            ⚔️ Compare with Another Candidate
          </Link>
        </div>
      </section>

      {/* Back links */}
      <div className="mt-8 text-center space-y-2">
        <Link
          href={`/constituency/${candidate.constituency?.id}`}
          className="block text-sm text-indigo-600 hover:underline"
        >
          View all candidates from {candidate.constituency?.name} →
        </Link>
        <Link
          href="/"
          className="block text-sm text-slate-500 hover:text-slate-700"
        >
          ← Search another PIN code
        </Link>
      </div>
    </div>
  );
}

/* ── Helper Components ── */

function CaseSummaryBadge({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  const color =
    count === 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : count <= 2
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  return (
    <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${color}`}>
      {label}: <strong>{count}</strong>
    </div>
  );
}

function ConvictedBadge({
  value,
  label,
}: {
  value?: boolean;
  label: string;
}) {
  const isYes = value === true;
  const color = isYes
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${color}`}>
      {label}: <strong>{isYes ? "Yes" : "No"}</strong>
    </div>
  );
}

function PerfStat({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

/* ── Helper Functions ── */

function getPartyColor(party: string): string {
  const colors: Record<string, string> = {
    BJP: "#FF6B00",
    INC: "#19AAED",
    AAP: "#0066B3",
    TMC: "#2E8B57",
    DMK: "#E30613",
    "JD(U)": "#137B13",
    SP: "#FF0000",
    BSP: "#22409A",
    TDP: "#FFFF00",
    BJD: "#006400",
  };
  return colors[party] || "#6B7280";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function generateSummary(c: any): string {
  const name = c.name ?? "This candidate";
  const terms = c.terms_served ?? 0;
  const since = c.first_elected ?? "unknown";
  const attendance = c.legislative_performance?.attendance_pct;
  const avgAttendance = c.legislative_performance?.national_avg_attendance ?? 76;
  const wealthGrowth = c.financials?.wealth_growth_pct;
  const inflation = c.financials?.inflation_pct_same_period ?? 45;
  const totalCases = c.criminal_record?.total_cases ?? 0;
  const seriousCases = c.criminal_record?.serious_cases ?? 0;
  const fundPct = c.fund_utilization?.utilization_pct;
  const fundCr = c.fund_utilization?.total_released_cr;

  const parts: string[] = [];

  parts.push(
    `${name} has been your MP for ${terms} term${terms !== 1 ? "s" : ""} (since ${since}).`
  );

  if (attendance != null) {
    const qualifier =
      attendance >= avgAttendance ? "above average" : "below average";
    parts.push(
      `They attended ${attendance}% of Parliament sessions (${qualifier}).`
    );
  }

  if (wealthGrowth != null) {
    parts.push(
      `Their declared wealth grew ${wealthGrowth}% over their tenure (inflation was ${inflation}%).`
    );
  }

  if (totalCases === 0) {
    parts.push("They have no pending criminal cases.");
  } else {
    parts.push(
      `They have ${totalCases} pending criminal case${totalCases !== 1 ? "s" : ""}${seriousCases > 0 ? ` (${seriousCases} serious)` : " (no serious charges)"}.`
    );
  }

  if (fundPct != null && fundCr != null) {
    parts.push(
      `They spent ${fundPct}% of their ₹${fundCr} Cr development fund.`
    );
  }

  return parts.join(" ");
}
