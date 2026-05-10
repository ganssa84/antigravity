"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";

type CommodityMonthlyRow = {
  commodity: number; home_team: string; year: number; month: number; amount: number; qty: number;
};

type Mode = "yearly" | "monthly" | "quarterly";

const YEAR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f87171"];
const LINE_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f87171", "#a78bfa", "#fb923c", "#34d399"];

const QUARTERS = [
  { name: "Q1", months: [1, 2, 3] },
  { name: "Q2", months: [4, 5, 6] },
  { name: "Q3", months: [7, 8, 9] },
  { name: "Q4", months: [10, 11, 12] },
];

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return v.toLocaleString();
}

export default function CommodityCompareChart({
  data,
  allYears,
}: {
  data: CommodityMonthlyRow[];
  allYears: number[];
}) {
  const [mode, setMode] = useState<Mode>("yearly");
  const maxYear = allYears[allYears.length - 1] ?? new Date().getFullYear();
  const [viewYear, setViewYear] = useState<number>(maxYear);

  const { chartData, topCommodities } = useMemo(() => {
    if (mode === "yearly") {
      // Aggregate by commodity × year, find top 10
      const totals = new Map<number, number>();
      const byKey = new Map<string, number>();
      for (const r of data) {
        totals.set(r.commodity, (totals.get(r.commodity) ?? 0) + r.amount);
        const k = `${r.commodity}|${r.year}`;
        byKey.set(k, (byKey.get(k) ?? 0) + r.amount);
      }
      const top = Array.from(totals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c]) => c);

      const rows = top.map(c => {
        const row: Record<string, unknown> = { name: `C${c}` };
        for (const y of allYears) {
          row[`${y}년`] = Math.round(byKey.get(`${c}|${y}`) ?? 0);
        }
        return row;
      });
      return { chartData: rows, topCommodities: top };
    }

    // monthly / quarterly: filter by viewYear, top 8 commodities
    const filtered = data.filter(r => r.year === viewYear);
    const totals = new Map<number, number>();
    for (const r of filtered) totals.set(r.commodity, (totals.get(r.commodity) ?? 0) + r.amount);
    const top = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([c]) => c);

    if (mode === "monthly") {
      const rows = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const row: Record<string, unknown> = { name: `${month}월` };
        for (const c of top) {
          const amt = filtered.filter(r => r.commodity === c && r.month === month).reduce((s, r) => s + r.amount, 0);
          row[`C${c}`] = Math.round(amt);
        }
        return row;
      });
      return { chartData: rows, topCommodities: top };
    }

    // quarterly
    const rows = QUARTERS.map(q => {
      const row: Record<string, unknown> = { name: q.name };
      for (const c of top) {
        const amt = filtered.filter(r => r.commodity === c && q.months.includes(r.month)).reduce((s, r) => s + r.amount, 0);
        row[`C${c}`] = Math.round(amt);
      }
      return row;
    });
    return { chartData: rows, topCommodities: top };
  }, [data, allYears, mode, viewYear]);

  if (data.length === 0) return null;

  const barSize = mode === "yearly" ? 10 : undefined;
  const yearlyChartHeight = Math.max(280, topCommodities.length * (allYears.length * 12 + 14) + 60);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Commodity별 매출</h3>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["yearly", "monthly", "quarterly"] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "yearly" ? "년도별" : m === "monthly" ? "월별" : "분기별"}
            </button>
          ))}
        </div>
      </div>

      {mode !== "yearly" && allYears.length > 1 && (
        <div className="flex gap-1 mt-2 mb-4">
          {allYears.map(y => (
            <button
              key={y}
              onClick={() => setViewYear(y)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewYear === y ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {y}년
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mb-4">
        {mode === "yearly"
          ? `${allYears[0] ?? ""}년 ~ ${allYears[allYears.length - 1] ?? ""}년 · Top 10 Commodity`
          : `${viewYear}년 · Top 8 Commodity`}
      </p>

      {mode === "yearly" ? (
        <ResponsiveContainer width="100%" height={yearlyChartHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="25%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAmount} />
            <YAxis type="category" dataKey="name" width={52} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            {allYears.map((y, i) => (
              <Bar key={y} dataKey={`${y}년`} fill={YEAR_COLORS[i % YEAR_COLORS.length]} radius={[0, 2, 2, 0]} barSize={barSize} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : mode === "monthly" ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAmount} width={48} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            {topCommodities.map((c, i) => (
              <Line
                key={c}
                type="monotone"
                dataKey={`C${c}`}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAmount} width={48} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            {topCommodities.map((c, i) => (
              <Bar key={c} dataKey={`C${c}`} fill={LINE_COLORS[i % LINE_COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
