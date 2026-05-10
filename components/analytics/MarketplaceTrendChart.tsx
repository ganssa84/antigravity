"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { MARKETPLACE_NAMES } from "./BRNPieChart";

const MARKETPLACE_BRNS = ["2208162517", "1208800767", "1198666372", "2208183676", "8158101244"] as const;
const MP_COLORS: Record<string, string> = {
  "2208162517": "#03c75a",
  "1208800767": "#ff6b00",
  "1198666372": "#6366f1",
  "2208183676": "#1a73e8",
  "8158101244": "#e11d48",
};

type TrendRow = Record<string, number | string>;

export default function MarketplaceTrendChart({ data }: { data: TrendRow[] }) {
  if (data.length < 2) return null;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">마켓플레이스 연도별 점유율 추이</h3>
      <p className="text-xs text-gray-400 mb-4">연도별 각 마켓플레이스의 매출 비중 (%)</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            width={44}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(v, name) => [`${v}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
          {MARKETPLACE_BRNS.map(brn => (
            <Bar
              key={brn}
              dataKey={MARKETPLACE_NAMES[brn] || brn}
              stackId="a"
              fill={MP_COLORS[brn]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
