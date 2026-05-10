"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Product = { material: string; material_id: string; amount: number; qty: number };

const TOP_OPTIONS = [15, 30, 50] as const;
type TopN = typeof TOP_OPTIONS[number];

function formatAmount(v: number) {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억`;
  return `${(v / 10_000).toFixed(0)}만`;
}

function truncate(str: string, max = 28) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function TopProductsChart({ data }: { data: Product[] }) {
  const [topN, setTopN] = useState<TopN>(15);

  const sorted = [...data].sort((a, b) => b.amount - a.amount).slice(0, topN);

  const chartData = sorted.map((p) => ({
    ...p,
    name: truncate(p.material),
    value: p.amount,
  }));

  const chartHeight = Math.max(320, chartData.length * 26 + 60);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Top {topN} 제품 (매출)</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {TOP_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setTopN(n)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                topN === n ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Top {n}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
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
            width={220}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(v) => [`${(v as number).toLocaleString()} 원`, "매출"]}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={`hsl(${230 + i * 6}, 65%, ${56 - i * 0.8}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
