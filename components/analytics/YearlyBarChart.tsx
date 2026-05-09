"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type YearlyStat = { year: number; amount: number; qty: number };

const COLORS = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  return `${(v / 10_000).toFixed(0)}만`;
}

export default function YearlyBarChart({ data }: { data: YearlyStat[] }) {
  return (
    <div className="rounded-2xl bg-white/3 border border-white/8 p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4">연도별 총 매출</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatAmount} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
            formatter={(v) => [`${(v as number).toLocaleString()} 원`, "매출"]}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
