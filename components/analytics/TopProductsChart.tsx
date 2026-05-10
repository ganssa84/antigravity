"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MARKETPLACE_NAMES } from "./BRNPieChart";

type Product = { material: string; material_id: string; amount: number; qty: number };
type ProductBrn = { material: string; material_id: string; brn: string; amount: number };

const TOP_OPTIONS = [15, 30, 50] as const;
type TopN = typeof TOP_OPTIONS[number];

function formatAmount(v: number) {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억`;
  return `${(v / 10_000).toFixed(0)}만`;
}

function truncate(str: string, max = 30) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function TopProductsChart({
  data,
  productBrn,
}: {
  data: Product[];
  productBrn: ProductBrn[];
}) {
  const [topN, setTopN] = useState<TopN>(15);
  const [selectedBrn, setSelectedBrn] = useState<string>("ALL");

  const availableBrns = useMemo(() => {
    return [...new Set(productBrn.map(r => r.brn))].sort();
  }, [productBrn]);

  const displayData = useMemo(() => {
    if (selectedBrn === "ALL") {
      return data.slice(0, topN);
    }
    const filtered = productBrn.filter(r => r.brn === selectedBrn);
    const map = new Map<string, { material: string; material_id: string; amount: number; qty: number }>();
    for (const r of filtered) {
      const ex = map.get(r.material_id);
      if (ex) ex.amount += r.amount;
      else map.set(r.material_id, { material: r.material, material_id: r.material_id, amount: r.amount, qty: 0 });
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, topN);
  }, [data, productBrn, selectedBrn, topN]);

  const chartData = displayData.map((p) => ({
    name: truncate(p.material),
    value: p.amount,
  }));

  const chartHeight = Math.max(320, chartData.length * 26 + 60);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
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

      {/* Marketplace filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setSelectedBrn("ALL")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedBrn === "ALL" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          전체
        </button>
        {availableBrns.map(brn => (
          <button
            key={brn}
            onClick={() => setSelectedBrn(brn)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedBrn === brn ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {MARKETPLACE_NAMES[brn] || brn}
          </button>
        ))}
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
            width={230}
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
              <Cell key={i} fill={`hsl(${230 + i * 5}, 65%, ${56 - i * 0.6}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
