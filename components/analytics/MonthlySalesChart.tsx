"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type MonthlyPoint = { month: number; amount: number; qty: number };
type ByYear = Record<number, MonthlyPoint[]>;

const YEAR_COLORS: Record<number, string> = {
  2023: "#60a5fa",
  2024: "#34d399",
  2025: "#a78bfa",
  2026: "#fbbf24",
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  return `${(v / 10_000).toFixed(0)}만`;
}

export default function MonthlySalesChart({ byYear }: { byYear: ByYear }) {
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b);

  // Build unified month-indexed data
  const chartData = MONTH_LABELS.map((label, idx) => {
    const month = idx + 1;
    const row: Record<string, number | string> = { month: label };
    for (const yr of years) {
      const point = byYear[yr]?.find((p) => p.month === month);
      if (point) row[yr] = point.amount;
    }
    return row;
  });

  return (
    <div className="rounded-2xl bg-white/3 border border-white/8 p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4">월별 매출 추이 (연도별)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatAmount} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
          {years.map((yr) => (
            <Line
              key={yr}
              type="monotone"
              dataKey={yr}
              name={`${yr}년`}
              stroke={YEAR_COLORS[yr] || "#94a3b8"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
