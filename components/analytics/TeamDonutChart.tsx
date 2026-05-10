"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type TeamStat = { home_team: string; amount: number; qty: number };

const TEAM_COLORS: Record<string, string> = {
  PSD: "#6366f1", EMD: "#10b981", ISD: "#a78bfa",
  IATD: "#f59e0b", ASD: "#f87171", AAD: "#fb923c",
};

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조원`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`;
  return `${(v / 10_000).toFixed(0)}만원`;
}

const RADIAN = Math.PI / 180;

const renderLabel = (props: Record<string, unknown>) => {
  const { cx, cy, midAngle, outerRadius, name, percent } = props;
  if ((percent as number) < 0.005) return null;
  const angle = -(midAngle as number) * RADIAN;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const or = outerRadius as number;
  const cxN = cx as number;
  const cyN = cy as number;
  const sx = cxN + (or + 3) * cos;
  const sy = cyN + (or + 3) * sin;
  const mx = cxN + (or + 18) * cos;
  const my = cyN + (or + 18) * sin;
  const ex = mx + (cos >= 0 ? 16 : -16);
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";
  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="#94a3b8" strokeWidth={1} fill="none" />
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={ey}
        fill="#374151"
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={500}
      >
        {name as string}
      </text>
    </g>
  );
};

export default function TeamDonutChart({ data }: { data: TeamStat[] }) {
  const total = data.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Home Team별 매출 비중</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="home_team"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={82}
            paddingAngle={2}
            label={renderLabel as never}
            labelLine={false}
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
