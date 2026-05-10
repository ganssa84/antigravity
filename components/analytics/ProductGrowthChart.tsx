"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";

export type GrowthItem = {
  material: string;
  material_id: string;
  currentAmount: number;
  prevAmount: number;
  changePct: number;
};

function truncate(s: string, n = 32) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만`;
  return v.toLocaleString();
}

function SubChart({ data, color, title }: { data: GrowthItem[]; color: string; title: string }) {
  const chartData = data.map((d) => ({
    name: truncate(d.material),
    pct: Math.abs(d.changePct),
    label: d.changePct >= 0 ? `+${d.changePct.toFixed(0)}%` : `${d.changePct.toFixed(0)}%`,
    cur: d.currentAmount,
    prev: d.prevAmount,
  }));
  const h = chartData.length * 36 + 16;

  return (
    <div>
      <p className="text-xs font-semibold mb-3" style={{ color }}>{title}</p>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            width={240}
            tick={{ fill: "#374151", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 12 }}
            formatter={(_v, _n, props) => {
              const d = props.payload as { cur: number; prev: number; pct: number; label: string };
              return [
                `${d.label} · ${formatAmount(d.cur)}원 (전년 ${formatAmount(d.prev)}원)`,
                "변화율",
              ];
            }}
          />
          <Bar dataKey="pct" fill={color} radius={[0, 4, 4, 0]} barSize={18}>
            <LabelList
              dataKey="label"
              position="right"
              style={{ fill: color, fontSize: 10, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type Props = {
  topGrowing: GrowthItem[];
  topDeclining: GrowthItem[];
  currentYear: number;
  prevYear: number;
};

export default function ProductGrowthChart({ topGrowing, topDeclining, currentYear, prevYear }: Props) {
  if (topGrowing.length === 0 && topDeclining.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">제품 YoY 성장/감소</h3>
      <p className="text-xs text-gray-400 mb-5">
        {prevYear} → {currentYear} 연도별 매출 변화율 기준
      </p>
      <div className={`grid gap-8 ${topGrowing.length > 0 && topDeclining.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        {topGrowing.length > 0 && (
          <SubChart data={topGrowing} color="#10b981" title={`성장 Top ${topGrowing.length}`} />
        )}
        {topDeclining.length > 0 && (
          <SubChart data={topDeclining} color="#ef4444" title={`감소 Top ${topDeclining.length}`} />
        )}
      </div>
    </div>
  );
}
