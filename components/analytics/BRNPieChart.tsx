"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type BrnTotal = { brn: string; amount: number; qty: number };

const COLORS = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f87171", "#fb923c", "#38bdf8", "#4ade80"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B원`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`;
  return `${(v / 10_000).toFixed(0)}만원`;
}

export default function BRNPieChart({ data }: { data: BrnTotal[] }) {
  const total = data.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="rounded-2xl bg-white/3 border border-white/8 p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4">BRN별 매출 비중</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="brn"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : 0;
              return [`${formatAmount(n)} (${((n / total) * 100).toFixed(1)}%)`, "매출"];
            }}
          />
          <Legend
            formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
