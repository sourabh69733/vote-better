"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface WealthChartProps {
  elections: { year: number; assets: number; liabilities: number }[];
  wealthGrowthPct: number;
  inflationPct: number;
}

function formatCrore(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function WealthChart({
  elections,
  wealthGrowthPct,
  inflationPct,
}: WealthChartProps) {
  const data = elections.map((e) => ({
    year: e.year.toString(),
    assets: e.assets,
    liabilities: e.liabilities,
    netWorth: e.assets - e.liabilities,
  }));

  // Severity of wealth growth
  const ratio = wealthGrowthPct / Math.max(inflationPct, 1);
  let severityColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  let severityEmoji = "🟢";

  if (ratio > 5) {
    severityColor = "text-red-700 bg-red-50 border-red-200";
    severityEmoji = "🔴";
  } else if (ratio > 2) {
    severityColor = "text-amber-700 bg-amber-50 border-amber-200";
    severityEmoji = "🟡";
  }

  return (
    <div>
      {/* Growth summary badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium mb-4 ${severityColor}`}
      >
        <span>{severityEmoji}</span>
        <span>
          Wealth grew <strong>{wealthGrowthPct}%</strong> in{" "}
          {elections.length > 1
            ? `${elections[elections.length - 1].year - elections[0].year} years`
            : "—"}
          {" "}(inflation was {inflationPct}%)
        </span>
      </div>

      {/* Chart */}
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => formatCrore(v)}
              tick={{ fontSize: 11 }}
              width={70}
            />
            <Tooltip
              formatter={(value) => formatCrore(Number(value))}
              labelFormatter={(label) => `Election ${label}`}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="assets" name="Total Assets" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === data.length - 1 ? "#4F46E5" : "#A5B4FC"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Asset details table */}
      <div className="mt-3 text-xs text-slate-500">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-1 font-medium">Year</th>
              <th className="text-right py-1 font-medium">Assets</th>
              <th className="text-right py-1 font-medium">Liabilities</th>
              <th className="text-right py-1 font-medium">Net Worth</th>
            </tr>
          </thead>
          <tbody>
            {elections.map((e) => (
              <tr key={e.year} className="border-b border-slate-50">
                <td className="py-1">{e.year}</td>
                <td className="text-right">{formatCrore(e.assets)}</td>
                <td className="text-right">{formatCrore(e.liabilities)}</td>
                <td className="text-right font-medium">
                  {formatCrore(e.assets - e.liabilities)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
