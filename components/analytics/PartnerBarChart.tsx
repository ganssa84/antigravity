"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type PartnerStat = { partner_name: string; amount: number; qty: number; num_products: number };

function truncate(str: string, max = 10) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function PartnerBarChart({ data }: { data: PartnerStat[] }) {
  const top = data.slice(0, 12);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">거래 업체별 매출 Top 12</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          layout="vertical"
          data={top.map((p) => ({ ...p, name: truncate(p.partner_name) }))}
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v >= 100_000_000 ? `${(v / 100_000_000).toFixed(0)}억` : `${(v / 10_000).toFixed(0)}만`
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(v) => [`${(v as number).toLocaleString()} 원`, "매출"]}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {top.map((_, i) => (
              <Cell key={i} fill={`hsl(${160 + i * 12}, 55%, ${48 - i}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
