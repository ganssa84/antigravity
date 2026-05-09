"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type TeamStat = { home_team: string; amount: number; qty: number };

const TEAM_COLORS: Record<string, string> = {
  PSD: "#60a5fa",
  EMD: "#34d399",
  CMSD: "#a78bfa",
  IATD: "#fbbf24",
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
    <div className="rounded-2xl bg-white/3 border border-white/8 p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Home Team별 매출 비중</h3>
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
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : 0;
              return [`${formatAmount(n)} (${((n / total) * 100).toFixed(1)}%)`, "매출"];
            }}
          />
          <Legend
            formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
