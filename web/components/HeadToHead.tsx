import { formatCurrency } from "@/lib/translations";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface HeadToHeadProps {
  candidateA: any;
  candidateB: any;
}

interface ComparisonRow {
  label: string;
  icon: string;
  valueA: string | number;
  valueB: string | number;
  rawA: number;
  rawB: number;
  higherIsBetter: boolean;
  /** If true, lower is better (like criminal cases) */
  lowerIsBetter?: boolean;
}

function getWinner(
  rawA: number,
  rawB: number,
  higherIsBetter: boolean,
  lowerIsBetter?: boolean
): "A" | "B" | "tie" {
  if (rawA === rawB) return "tie";
  if (lowerIsBetter) return rawA < rawB ? "A" : "B";
  if (higherIsBetter) return rawA > rawB ? "A" : "B";
  return "tie";
}

export default function HeadToHead({
  candidateA,
  candidateB,
}: HeadToHeadProps) {
  const perfA = candidateA.legislative_performance ?? {};
  const perfB = candidateB.legislative_performance ?? {};
  const finA = candidateA.financials ?? {};
  const finB = candidateB.financials ?? {};
  const crimeA = candidateA.criminal_record ?? {};
  const crimeB = candidateB.criminal_record ?? {};
  const fundA = candidateA.fund_utilization ?? {};
  const fundB = candidateB.fund_utilization ?? {};

  const rows: ComparisonRow[] = [
    {
      label: "Education",
      icon: "🎓",
      valueA: candidateA.education ?? "—",
      valueB: candidateB.education ?? "—",
      rawA: educationScore(candidateA.education),
      rawB: educationScore(candidateB.education),
      higherIsBetter: true,
    },
    {
      label: "Attendance",
      icon: "🏛️",
      valueA: `${perfA.attendance_pct ?? 0}%`,
      valueB: `${perfB.attendance_pct ?? 0}%`,
      rawA: perfA.attendance_pct ?? 0,
      rawB: perfB.attendance_pct ?? 0,
      higherIsBetter: true,
    },
    {
      label: "Wealth Growth",
      icon: "💰",
      valueA: `+${finA.wealth_growth_pct ?? 0}%`,
      valueB: `+${finB.wealth_growth_pct ?? 0}%`,
      rawA: finA.wealth_growth_pct ?? 0,
      rawB: finB.wealth_growth_pct ?? 0,
      higherIsBetter: false,
      lowerIsBetter: true,
    },
    {
      label: "Criminal Cases",
      icon: "⚖️",
      valueA: `${crimeA.total_cases ?? 0}${crimeA.serious_cases ? ` (${crimeA.serious_cases} serious)` : ""}`,
      valueB: `${crimeB.total_cases ?? 0}${crimeB.serious_cases ? ` (${crimeB.serious_cases} serious)` : ""}`,
      rawA: crimeA.total_cases ?? 0,
      rawB: crimeB.total_cases ?? 0,
      higherIsBetter: false,
      lowerIsBetter: true,
    },
    {
      label: "Fund Utilized",
      icon: "🏗️",
      valueA: `${fundA.utilization_pct ?? 0}%`,
      valueB: `${fundB.utilization_pct ?? 0}%`,
      rawA: fundA.utilization_pct ?? 0,
      rawB: fundB.utilization_pct ?? 0,
      higherIsBetter: true,
    },
    {
      label: "Questions Asked",
      icon: "❓",
      valueA: `${perfA.questions_asked ?? 0}`,
      valueB: `${perfB.questions_asked ?? 0}`,
      rawA: perfA.questions_asked ?? 0,
      rawB: perfB.questions_asked ?? 0,
      higherIsBetter: true,
    },
    {
      label: "Debates",
      icon: "🗣️",
      valueA: `${perfA.debates_participated ?? 0}`,
      valueB: `${perfB.debates_participated ?? 0}`,
      rawA: perfA.debates_participated ?? 0,
      rawB: perfB.debates_participated ?? 0,
      higherIsBetter: true,
    },
    {
      label: "Current Assets",
      icon: "🏦",
      valueA: formatCurrency(finA.elections?.at(-1)?.assets ?? 0),
      valueB: formatCurrency(finB.elections?.at(-1)?.assets ?? 0),
      rawA: finA.elections?.at(-1)?.assets ?? 0,
      rawB: finB.elections?.at(-1)?.assets ?? 0,
      higherIsBetter: false,
    },
    {
      label: "Terms Served",
      icon: "📅",
      valueA: `${candidateA.terms_served ?? 0}`,
      valueB: `${candidateB.terms_served ?? 0}`,
      rawA: candidateA.terms_served ?? 0,
      rawB: candidateB.terms_served ?? 0,
      higherIsBetter: true,
    },
  ];

  // Count wins
  let winsA = 0;
  let winsB = 0;
  rows.forEach((r) => {
    const w = getWinner(r.rawA, r.rawB, r.higherIsBetter, r.lowerIsBetter);
    if (w === "A") winsA++;
    if (w === "B") winsB++;
  });

  return (
    <div>
      {/* Header cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <CandidateHeader candidate={candidateA} wins={winsA} />
        <CandidateHeader candidate={candidateB} wins={winsB} />
      </div>

      {/* Comparison rows */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {rows.map((row, i) => {
          const winner = getWinner(
            row.rawA,
            row.rawB,
            row.higherIsBetter,
            row.lowerIsBetter
          );

          return (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_auto_1fr] items-center px-3 py-3 ${
                i !== rows.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              {/* Value A */}
              <div
                className={`text-sm text-right pr-2 ${
                  winner === "A" ? "font-bold text-emerald-700" : "text-slate-600"
                }`}
              >
                {winner === "A" && <span className="mr-1">🏆</span>}
                {row.valueA}
              </div>

              {/* Label (center) */}
              <div className="text-center px-2 min-w-[100px]">
                <span className="text-sm">{row.icon}</span>
                <div className="text-xs text-slate-500 leading-tight">
                  {row.label}
                </div>
              </div>

              {/* Value B */}
              <div
                className={`text-sm pl-2 ${
                  winner === "B" ? "font-bold text-emerald-700" : "text-slate-600"
                }`}
              >
                {row.valueB}
                {winner === "B" && <span className="ml-1">🏆</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-slate-400 text-center">
        🏆 indicates the objectively better number for each metric. This is NOT
        an endorsement — you decide which metrics matter to you.
      </p>
    </div>
  );
}

/* ── Sub-components ── */

function CandidateHeader({
  candidate,
  wins,
}: {
  candidate: any;
  wins: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
      <div
        className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold"
        style={{
          backgroundColor: getPartyColor(candidate.party) + "20",
          color: getPartyColor(candidate.party),
        }}
      >
        {candidate.name?.charAt(0)}
      </div>
      <h3 className="font-bold text-sm text-slate-900 mt-2 truncate">
        {candidate.name}
      </h3>
      <span
        className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white mt-1"
        style={{ backgroundColor: getPartyColor(candidate.party) }}
      >
        {candidate.party}
      </span>
      <div className="text-xs text-slate-500 mt-1">
        {candidate.constituency?.name}
      </div>
      <div className="mt-2 text-xs font-semibold text-indigo-600">
        {wins} 🏆
      </div>
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

function educationScore(edu?: string): number {
  if (!edu) return 0;
  const e = edu.toLowerCase();
  if (e.includes("ph.d") || e.includes("doctorate")) return 6;
  if (e.includes("m.") || e.includes("master") || e.includes("mba") || e.includes("llb")) return 5;
  if (e.includes("b.") || e.includes("bachelor") || e.includes("graduate")) return 4;
  if (e.includes("diploma")) return 3;
  if (e.includes("12th") || e.includes("hsc")) return 2;
  if (e.includes("10th") || e.includes("ssc")) return 1;
  return 3; // default middle
}
