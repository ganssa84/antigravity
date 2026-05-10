"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";

export type YearlyStat = {
  year: number;
  amount: number;
  qty: number;
  compareAmount?: number;
  compareLabel?: string;
};

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return v.toLocaleString();
}

export default function YearlyBarChart({ data }: { data: YearlyStat[] }) {
  const chartData = data.map((d, i) => ({
    ...d,
    growth: d.compareAmount != null
      ? (d.compareAmount === 0 ? null : ((d.amount - d.compareAmount) / d.compareAmount) * 100)
      : (i === 0 || data[i - 1].amount === 0
          ? null
          : ((d.amount - data[i - 1].amount) / data[i - 1].amount) * 100),
  }));

  const GrowthLabel = (props: Record<string, unknown>) => {
    const value = props.value as number | null | undefined;
    if (value == null) return null;
    const x = props.x as number;
    const y = props.y as number;
    const width = props.width as number;
    const idx = props.index as number;
    const item = chartData[idx];
    const isPos = value >= 0;
    const hasCompare = !!item?.compareLabel;
    return (
      <g>
        {hasCompare && (
          <text x={x + width / 2} y={y - 19} textAnchor="middle" fill="#9ca3af" fontSize={8}>
            {item.compareLabel}
          </text>
        )}
        <text
          x={x + width / 2}
          y={y - (hasCompare ? 7 : 5)}
          textAnchor="middle"
          fill={isPos ? "#10b981" : "#ef4444"}
          fontSize={10}
          fontWeight={700}
        >
          {isPos ? "▲" : "▼"}{Math.abs(value).toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">연도별 총 매출</h3>
      <ResponsiveContainer width="100%" height={248}>
        <BarChart data={chartData} margin={{ top: 34, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatAmount} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
            formatter={(v, _n, props) => {
              const item = props.payload as YearlyStat & { growth: number | null };
              if (item?.compareLabel) {
                return [`${(v as number).toLocaleString()} 원 (${item.compareLabel})`, "매출"];
              }
              return [`${(v as number).toLocaleString()} 원`, "매출"];
            }}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            <LabelList dataKey="growth" content={GrowthLabel as never} />
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
