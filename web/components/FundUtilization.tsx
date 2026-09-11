import ELI5Card from "./ELI5Card";

interface FundUtilizationProps {
  releasedCr: number;
  utilizedCr: number;
  utilizationPct: number;
  categories: Record<string, number>;
}

const CATEGORY_ICONS: Record<string, string> = {
  roads: "🛣️",
  water: "🚰",
  education: "📚",
  health: "🏥",
  sanitation: "🧹",
  electricity: "💡",
  other: "📦",
};

export default function FundUtilization({
  releasedCr,
  utilizedCr,
  utilizationPct,
  categories,
}: FundUtilizationProps) {
  let barColor = "bg-emerald-500";
  let label = "Used most of your area's development fund";
  let badgeColor = "text-emerald-700 bg-emerald-50";

  if (utilizationPct < 40) {
    barColor = "bg-red-500";
    label = `Left ${100 - utilizationPct}% of your area's development fund unspent`;
    badgeColor = "text-red-700 bg-red-50";
  } else if (utilizationPct < 75) {
    barColor = "bg-amber-500";
    label = "Used some of the development fund";
    badgeColor = "text-amber-700 bg-amber-50";
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-sm text-slate-600">
          ₹{utilizedCr} Cr used of ₹{releasedCr} Cr
        </span>
        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {utilizationPct}%
        </span>
      </div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(utilizationPct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1">{label}</p>

      {/* Category breakdown */}
      {categories && Object.keys(categories).length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(categories)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, pct]) => (
              <div
                key={cat}
                className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2"
              >
                <span>{CATEGORY_ICONS[cat] ?? "📦"}</span>
                <div>
                  <div className="text-xs text-slate-500 capitalize">{cat}</div>
                  <div className="text-sm font-semibold text-slate-700">
                    {pct}%
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <ELI5Card title="What is MPLADS?">
        Every MP gets ₹5 Crore per year from the government to build things in
        YOUR area — roads, toilets, schools, water tanks. This number shows how
        much of that money your MP actually used vs left sitting in the bank.
      </ELI5Card>
    </div>
  );
}
