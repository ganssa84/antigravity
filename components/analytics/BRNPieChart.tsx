"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

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
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조원`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`;
  return `${(v / 10_000).toFixed(0)}만원`;
}

const RADIAN = Math.PI / 180;

const renderLabel = (props: Record<string, unknown>) => {
  const { cx, cy, midAngle, outerRadius, name, percent } = props;
  if ((percent as number) < 0.02) return null;
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

export default function BRNPieChart({ data }: { data: BrnTotal[] }) {
  const total = data.reduce((s, r) => s + r.amount, 0);
  const chartData = data.map((d) => ({
    ...d,
    name: MARKETPLACE_NAMES[d.brn] || d.brn,
  }));

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">마켓플레이스별 매출 비중</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart margin={{ top: -24, bottom: -24 }}>
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={105}
            paddingAngle={2}
            label={renderLabel as never}
            labelLine={false}
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
