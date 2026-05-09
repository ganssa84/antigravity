"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type Product = { material: string; material_id: string; amount: number; qty: number };

function truncate(str: string, max = 22) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function TopProductsChart({ data }: { data: Product[] }) {
  const [mode, setMode] = useState<"amount" | "qty">("amount");

  const sorted = [...data]
    .sort((a, b) => (mode === "qty" ? b.qty - a.qty : b.amount - a.amount))
    .slice(0, 15);

  const chartData = sorted.map((p) => ({
    ...p,
    name: truncate(p.material),
    value: mode === "qty" ? p.qty : p.amount,
  }));

  return (
    <div className="rounded-2xl bg-white/3 border border-white/8 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300">Top 15 제품</h3>
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {(["amount", "qty"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === m ? "bg-white/15 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {m === "amount" ? "매출" : "수량"}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              mode === "amount"
                ? v >= 100_000_000 ? `${(v / 100_000_000).toFixed(0)}억` : `${(v / 10_000).toFixed(0)}만`
                : v.toLocaleString()
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
            formatter={(v) => {
              const n = (v as number).toLocaleString();
              return mode === "amount" ? [`${n} 원`, "매출"] : [`${n} EA`, "수량"];
            }}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={`hsl(${210 + i * 12}, 70%, ${55 - i * 2}%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
