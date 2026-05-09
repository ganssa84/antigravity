"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type TeamStat = { home_team: string; amount: number; qty: number };

const TEAM_COLORS: Record<string, string> = {
  PSD: "#6366f1",
  EMD: "#10b981",
  ISD: "#a78bfa",
  IATD: "#f59e0b",
  ASD: "#f87171",
  AAD: "#fb923c",
};

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B원`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`;
  return `${(v / 10_000).toFixed(0)}만원`;
}

export default function TeamDonutChart({ data }: { data: TeamStat[] }) {
  const total = data.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Home Team별 매출 비중</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="home_team"
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={TEAM_COLORS[entry.home_team] || "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : 0;
              return [`${formatAmount(n)} (${((n / total) * 100).toFixed(1)}%)`, "매출"];
            }}
          />
          <Legend formatter={(value) => <span style={{ color: "#6b7280", fontSize: 12 }}>{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
