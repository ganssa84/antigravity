"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type MonthlyPoint = { month: number; amount: number; qty: number };
type ByYear = Record<number, MonthlyPoint[]>;

const YEAR_COLORS: Record<number, string> = {
  2023: "#6366f1",
  2024: "#0ea5e9",
  2025: "#10b981",
  2026: "#f59e0b",
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  return `${(v / 10_000).toFixed(0)}만`;
}

export default function MonthlySalesChart({ byYear }: { byYear: ByYear }) {
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

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
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">월별 매출 추이</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatAmount} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
            formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
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
