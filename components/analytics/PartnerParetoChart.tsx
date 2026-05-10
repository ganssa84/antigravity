"use client";

import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";

type PartnerRow = { partner_name: string; amount: number };

function truncate(s: string, n = 14) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return v.toLocaleString();
}

export default function PartnerParetoChart({ data }: { data: PartnerRow[] }) {
  const { displayData, n80 } = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.amount - a.amount);
    const total = sorted.reduce((s, r) => s + r.amount, 0);
    let cumulative = 0;
    let n80 = 0;
    const all = sorted.map((r, i) => {
      cumulative += r.amount;
      const cumPct = total > 0 ? (cumulative / total) * 100 : 0;
      if (n80 === 0 && cumPct >= 80) n80 = i + 1;
      return {
        name: truncate(r.partner_name),
        fullName: r.partner_name,
        amount: r.amount,
        cumPct: Math.round(cumPct * 10) / 10,
      };
    });
    if (n80 === 0) n80 = sorted.length;
    const withCore = all.map((d, i) => ({ ...d, isCore: i < n80 }));
    return { displayData: withCore.slice(0, 50), n80 };
  }, [data]);

  if (displayData.length === 0) return null;

  const barSize = Math.max(5, Math.min(20, Math.floor(560 / displayData.length)));

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700">거래처 Pareto 분석</h3>
        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-semibold">
          상위 {n80}개 = 전체 매출의 80%
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">거래처별 매출 및 누적 점유율 (상위 {displayData.length}개)</p>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={displayData} margin={{ top: 4, right: 48, left: 0, bottom: 72 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={formatAmount}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            width={36}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 12 }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
            formatter={(v, name) => {
              if (name === "누적") return [`${v}%`, "누적 점유율"];
              return [`${formatAmount(v as number)}원`, "매출"];
            }}
          />
          <ReferenceLine
            yAxisId="right"
            y={80}
            stroke="#ef4444"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: "80%", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
          />
          <Bar yAxisId="left" dataKey="amount" name="매출" radius={[3, 3, 0, 0]} barSize={barSize}>
            {displayData.map((d, i) => (
              <Cell key={i} fill={d.isCore ? "#6366f1" : "#d1d5db"} />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            dataKey="cumPct"
            name="누적"
            type="monotone"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
