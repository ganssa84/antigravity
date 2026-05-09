"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type BrnTotal = { brn: string; amount: number; qty: number };

export const MARKETPLACE_NAMES: Record<string, string> = {
  "2208162517": "네이버",
  "1208800767": "쿠팡",
  "1198666372": "나비엠알오",
  "2208183676": "지마켓옥션",
  "8158101244": "11번가",
};

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f87171", "#a78bfa"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B원`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`;
  return `${(v / 10_000).toFixed(0)}만원`;
}

export default function BRNPieChart({ data }: { data: BrnTotal[] }) {
  const total = data.reduce((s, r) => s + r.amount, 0);
  const chartData = data.map((d) => ({
    ...d,
    name: MARKETPLACE_NAMES[d.brn] || d.brn,
  }));

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">마켓플레이스별 매출 비중</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
