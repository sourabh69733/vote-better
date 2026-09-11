import Link from "next/link";
import { lookupPinCode, getConstituencyById, getCandidateById } from "@/lib/data";
import { formatCurrency } from "@/lib/translations";

interface PageProps {
  params: Promise<{ pincode: string }>;
}

export default async function AreaPage({ params }: PageProps) {
  const { pincode } = await params;
  const constituencyId = lookupPinCode(pincode);

  if (!constituencyId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          PIN Code Not Found
        </h1>
        <p className="text-slate-600 mb-6">
          We couldn&apos;t find constituency data for PIN code{" "}
          <span className="font-mono font-bold">{pincode}</span>.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center px-6 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          ← Try Another PIN Code
        </Link>
      </div>
    );
  }

  const constituency = getConstituencyById(constituencyId);
  if (!constituency) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">Constituency data not available.</p>
      </div>
    );
  }

  // Load the main candidate (first one is the sitting MP)
  const mpCandidate = constituency.candidates?.[0]
    ? getCandidateById(constituency.candidates[0].id || constituency.candidates[0])
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Area Header */}
      <div className="mb-8">
        <p className="text-sm text-slate-500 mb-1">
          📍 PIN Code: <span className="font-mono">{pincode}</span>
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          {constituency.name}, {constituency.state}
        </h1>
        <p className="text-slate-600 mt-1">Your elected representatives</p>
      </div>

      {/* Civic Pyramid — 3 Levels */}
      <div className="space-y-4">
        {/* Level 1: National — Lok Sabha MP */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-indigo-600 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <span>🏛️</span>
            <span>LEVEL 1 — NATIONAL</span>
            <span className="ml-auto text-indigo-200 text-xs">Lok Sabha MP</span>
          </div>

          {mpCandidate ? (
            <Link href={`/candidate/${mpCandidate.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Photo placeholder */}
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600 flex-shrink-0">
                  {mpCandidate.name?.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-900">
                    {mpCandidate.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mr-2"
                      style={{
                        backgroundColor: getPartyColor(mpCandidate.party),
                        color: "#fff",
                      }}
                    >
                      {mpCandidate.party}
                    </span>
                    {mpCandidate.education}
                  </p>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    <QuickStat
                      icon="🏛️"
                      label="Attendance"
                      value={`${mpCandidate.legislative_performance?.attendance_pct ?? "—"}%`}
                      severity={getAttendanceSeverity(
                        mpCandidate.legislative_performance?.attendance_pct,
                        mpCandidate.legislative_performance?.national_avg_attendance
                      )}
                    />
                    <QuickStat
                      icon="💰"
                      label="Assets"
                      value={formatCurrency(
                        mpCandidate.financials?.elections?.at(-1)?.assets ?? 0
                      )}
                      severity="neutral"
                    />
                    <QuickStat
                      icon="⚖️"
                      label="Cases"
                      value={`${mpCandidate.criminal_record?.total_cases ?? 0}`}
                      severity={getCaseSeverity(mpCandidate.criminal_record?.total_cases)}
                    />
                    <QuickStat
                      icon="🏗️"
                      label="Fund Used"
                      value={`${mpCandidate.fund_utilization?.utilization_pct ?? "—"}%`}
                      severity={getFundSeverity(mpCandidate.fund_utilization?.utilization_pct)}
                    />
                  </div>
                </div>

                {/* Arrow */}
                <span className="text-slate-400 text-xl mt-4">→</span>
              </div>
            </Link>
          ) : (
            <div className="p-4 text-slate-500">No MP data available</div>
          )}
        </div>

        {/* Level 2: State — MLA */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm opacity-60">
          <div className="bg-emerald-600 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <span>🏢</span>
            <span>LEVEL 2 — STATE</span>
            <span className="ml-auto text-emerald-200 text-xs">
              Vidhan Sabha MLA
            </span>
          </div>
          <div className="p-4 flex items-center gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
              🏗️
            </div>
            <div>
              <p className="font-semibold text-slate-500">Coming Soon</p>
              <p className="text-sm">MLA data will be added in Phase 3</p>
            </div>
          </div>
        </div>

        {/* Level 3: Local — Corporator */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm opacity-60">
          <div className="bg-amber-600 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <span>🏘️</span>
            <span>LEVEL 3 — LOCAL</span>
            <span className="ml-auto text-amber-200 text-xs">
              Ward Corporator
            </span>
          </div>
          <div className="p-4 flex items-center gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
              🏗️
            </div>
            <div>
              <p className="font-semibold text-slate-500">Coming Soon</p>
              <p className="text-sm">Local body data will be added in Phase 4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Constituency candidates link */}
      <div className="mt-6 text-center">
        <Link
          href={`/constituency/${constituencyId}`}
          className="text-indigo-600 hover:underline text-sm font-medium"
        >
          View all candidates from {constituency.name} →
        </Link>
      </div>

      {/* Back */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Search another PIN code
        </Link>
      </div>
    </div>
  );
}

/* ── Helper Components ── */

function QuickStat({
  icon,
  label,
  value,
  severity,
}: {
  icon: string;
  label: string;
  value: string;
  severity: "good" | "warning" | "danger" | "neutral";
}) {
  const colors = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div
      className={`rounded-lg border px-2 py-1.5 text-center ${colors[severity]}`}
    >
      <div className="text-xs opacity-70">
        {icon} {label}
      </div>
      <div className="font-bold text-sm">{value}</div>
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
    CPM: "#FF0000",
    NCP: "#004B87",
  };
  return colors[party] || "#6B7280";
}

function getAttendanceSeverity(
  pct?: number,
  avg?: number
): "good" | "warning" | "danger" | "neutral" {
  if (pct == null) return "neutral";
  const a = avg ?? 76;
  if (pct >= a) return "good";
  if (pct >= a - 15) return "warning";
  return "danger";
}

function getCaseSeverity(
  count?: number
): "good" | "warning" | "danger" | "neutral" {
  if (count == null) return "neutral";
  if (count === 0) return "good";
  if (count <= 2) return "warning";
  return "danger";
}

function getFundSeverity(
  pct?: number
): "good" | "warning" | "danger" | "neutral" {
  if (pct == null) return "neutral";
  if (pct >= 75) return "good";
  if (pct >= 40) return "warning";
  return "danger";
}
