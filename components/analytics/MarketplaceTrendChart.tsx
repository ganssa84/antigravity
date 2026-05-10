"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
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

const makeStackLabel = (color: string) => (props: Record<string, unknown>) => {
  const x = props.x as number;
  const y = props.y as number;
  const width = props.width as number;
  const height = props.height as number;
  const value = props.value as number;
  if (!value || value < 0.5) return null;

  if (value >= 10 && height >= 16) {
    return (
      <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={10} fontWeight={700}>
        {value.toFixed(0)}%
      </text>
    );
  }

  const cx = x + width;
  const cy = y + Math.max(height / 2, 0);
  return (
    <g>
      <line x1={cx} y1={cy} x2={cx + 14} y2={cy} stroke={color} strokeWidth={1.2} />
      <text x={cx + 17} y={cy} textAnchor="start" dominantBaseline="central" fill={color} fontSize={9} fontWeight={700}>
        {value.toFixed(0)}%
      </text>
    </g>
  );
};

export default function MarketplaceTrendChart({ data }: { data: TrendRow[] }) {
  if (data.length < 2) return null;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">마켓플레이스 연도별 점유율 추이</h3>
      <p className="text-xs text-gray-400 mb-4">연도별 각 마켓플레이스의 매출 비중 (%)</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 52, left: 0, bottom: 0 }} barCategoryGap="30%">
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
          {MARKETPLACE_BRNS.map((brn) => (
            <Bar
              key={brn}
              dataKey={MARKETPLACE_NAMES[brn] || brn}
              stackId="a"
              fill={MP_COLORS[brn]}
            >
              <LabelList
                dataKey={MARKETPLACE_NAMES[brn] || brn}
                content={makeStackLabel(MP_COLORS[brn]) as never}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
