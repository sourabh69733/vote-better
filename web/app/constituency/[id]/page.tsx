import Link from "next/link";
import { getConstituencyById, getCandidateById } from "@/lib/data";
import { formatCurrency } from "@/lib/translations";
import fs from "fs";
import path from "path";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const dir = path.join(process.cwd(), "public/data/constituencies");
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    return files.map((f) => ({ id: f.replace(".json", "") }));
  } catch {
    return [];
  }
}

export default async function ConstituencyPage({ params }: PageProps) {
  const { id } = await params;
  const constituency = getConstituencyById(id);

  if (!constituency) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Constituency Not Found
        </h1>
        <Link href="/" className="text-indigo-600 hover:underline">
          ← Go Home
        </Link>
      </div>
    );
  }

  // Load full candidate data for each candidate in the constituency
  const candidates = (constituency.candidates ?? [])
    .map((c: { id: string }) => getCandidateById(c.id))
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          📍 {constituency.name}
        </h1>
        <p className="text-slate-500">
          {constituency.state} · {constituency.type === "PC" ? "Lok Sabha" : "Vidhan Sabha"} Constituency
        </p>
        {candidates.length > 0 && (
          <p className="text-sm text-slate-400 mt-1">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Candidate cards */}
      {candidates.length > 0 ? (
        <div className="space-y-4">
          {candidates.map((c: Record<string, unknown>) => {
            const perf = (c.legislative_performance ?? {}) as Record<string, number>;
            const fin = (c.financials ?? {}) as Record<string, unknown>;
            const elections = (fin.elections ?? []) as { assets: number }[];
            const crime = (c.criminal_record ?? {}) as Record<string, number>;
            const fund = (c.fund_utilization ?? {}) as Record<string, number>;

            return (
              <Link
                key={c.id as string}
                href={`/candidate/${c.id}`}
                className="block bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{
                      backgroundColor: getPartyColor(c.party as string) + "20",
                      color: getPartyColor(c.party as string),
                    }}
                  >
                    {(c.name as string)?.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 truncate">
                        {c.name as string}
                      </h3>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white flex-shrink-0"
                        style={{
                          backgroundColor: getPartyColor(c.party as string),
                        }}
                      >
                        {c.party as string}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.education as string} · {c.terms_served as number} term{(c.terms_served as number) !== 1 ? "s" : ""}
                    </p>

                    {/* Quick metric row */}
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      <MiniMetric
                        label="Attendance"
                        value={`${perf.attendance_pct ?? 0}%`}
                        severity={
                          (perf.attendance_pct ?? 0) >= 76
                            ? "good"
                            : (perf.attendance_pct ?? 0) >= 60
                              ? "warning"
                              : "danger"
                        }
                      />
                      <MiniMetric
                        label="Assets"
                        value={formatCurrency(
                          elections.at(-1)?.assets ?? 0
                        )}
                        severity="neutral"
                      />
                      <MiniMetric
                        label="Cases"
                        value={`${crime.total_cases ?? 0}`}
                        severity={
                          (crime.total_cases ?? 0) === 0
                            ? "good"
                            : (crime.total_cases ?? 0) <= 2
                              ? "warning"
                              : "danger"
                        }
                      />
                      <MiniMetric
                        label="Fund"
                        value={`${fund.utilization_pct ?? 0}%`}
                        severity={
                          (fund.utilization_pct ?? 0) >= 75
                            ? "good"
                            : (fund.utilization_pct ?? 0) >= 40
                              ? "warning"
                              : "danger"
                        }
                      />
                    </div>
                  </div>

                  <span className="text-slate-400 mt-3">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-slate-500">
            No candidate data available for this constituency yet.
          </p>
        </div>
      )}

      {/* Compare any two */}
      {candidates.length >= 2 && (
        <div className="mt-6 text-center">
          <Link
            href={`/compare/${candidates[0].id}/${candidates[1].id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            ⚔️ Compare Top 2 Candidates
          </Link>
        </div>
      )}

      {/* Back */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Search by PIN code
        </Link>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function MiniMetric({
  label,
  value,
  severity,
}: {
  label: string;
  value: string;
  severity: "good" | "warning" | "danger" | "neutral";
}) {
  const colors = {
    good: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-red-700",
    neutral: "text-slate-700",
  };

  return (
    <div className="text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-sm font-bold ${colors[severity]}`}>{value}</div>
    </div>
  );
}

/* ── Helpers ── */

function getPartyColor(party: string): string {
  const colors: Record<string, string> = {
    BJP: "#FF6B00", INC: "#19AAED", AAP: "#0066B3", TMC: "#2E8B57",
    DMK: "#E30613", "JD(U)": "#137B13", SP: "#FF0000", BSP: "#22409A",
    TDP: "#DAA520", BJD: "#006400",
  };
  return colors[party] || "#6B7280";
}
