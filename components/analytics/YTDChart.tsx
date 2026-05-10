"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type MonthlyPoint = { month: number; amount: number };
type ByYear = Record<number, MonthlyPoint[]>;

const YEAR_COLORS: Record<number, string> = {
  2023: "#6366f1", 2024: "#0ea5e9", 2025: "#10b981", 2026: "#f59e0b",
};

const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const QUARTER_LABELS = ["Q1 (1-3월)", "Q2 (4-6월)", "Q3 (7-9월)", "Q4 (10-12월)"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return v.toLocaleString();
}

export default function YTDChart({ byYear }: { byYear: ByYear }) {
  const [mode, setMode] = useState<"monthly" | "quarterly">("monthly");
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  const chartData =
    mode === "monthly"
      ? MONTH_LABELS.map((label, idx) => {
          const month = idx + 1;
          const row: Record<string, number | string> = { period: label };
          for (const yr of years) {
            const point = byYear[yr]?.find((p) => p.month === month);
            row[yr] = point?.amount ?? 0;
          }
          return row;
        })
      : QUARTER_LABELS.map((label, qIdx) => {
          const row: Record<string, number | string> = { period: label };
          for (const yr of years) {
            const months = byYear[yr] ?? [];
            row[yr] = months
              .filter((p) => Math.ceil(p.month / 3) === qIdx + 1)
              .reduce((s, p) => s + p.amount, 0);
          }
          return row;
        });

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">기간별 매출 비교 (연도)</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["monthly", "quarterly"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "monthly" ? "월별" : "분기별"}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="period" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatAmount} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
          {years.map((yr) => (
            <Bar
              key={yr}
              dataKey={yr}
              name={`${yr}년`}
              fill={YEAR_COLORS[yr] || "#94a3b8"}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
