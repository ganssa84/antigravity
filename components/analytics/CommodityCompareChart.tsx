"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Legend,
} from "recharts";

type CommodityRow = {
  commodity: number;
  currentAmount: number;
  prevAmount: number;
  change: number | null;
};

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return v.toLocaleString();
}

// Custom label rendered at the end of the current-year bar
const ChangeLabel = (props: Record<string, unknown>) => {
  const x = props.x as number;
  const y = props.y as number;
  const width = props.width as number;
  const height = props.height as number;
  const value = props.value as number | null;
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  return (
    <text
      x={x + width + 6}
      y={y + height / 2 + 4}
      fill={isPositive ? "#10b981" : "#ef4444"}
      fontSize={11}
      fontWeight={600}
    >
      {isPositive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </text>
  );
};

export default function CommodityCompareChart({
  data,
  currentYear,
  prevYear,
}: {
  data: CommodityRow[];
  currentYear: number;
  prevYear: number;
}) {
  if (data.length === 0) return null;

  const chartData = data.map((r) => ({
    name: `C${r.commodity}`,
    [`${prevYear}년`]: r.prevAmount,
    [`${currentYear}년`]: r.currentAmount,
    change: r.change,
  }));

  const barHeight = 36;
  const chartHeight = Math.max(180, chartData.length * barHeight * 2 + 60);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Commodity별 매출 증감</h3>
        <span className="text-xs text-gray-400">
          {prevYear}년 → {currentYear}년 비교
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">C코드 = Commodity 코드</p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatAmount}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={52}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
          <Bar dataKey={`${prevYear}년`} fill="#e5e7eb" radius={[0, 3, 3, 0]} />
          <Bar dataKey={`${currentYear}년`} fill="#6366f1" radius={[0, 3, 3, 0]}>
            <LabelList dataKey="change" content={ChangeLabel as never} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
