"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from "recharts";

type Product = {
  material: string; material_id: string; home_team: string;
  year: number; amount: number; qty: number;
};

const TEAM_COLORS: Record<string, string> = {
  AAD: "#fb923c", ASD: "#f87171", ISD: "#a78bfa",
  EMD: "#10b981", PSD: "#6366f1", IATD: "#f59e0b",
};

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return v.toLocaleString();
}

const ChangeLabel = (props: Record<string, unknown>) => {
  const x = props.x as number, y = props.y as number;
  const width = props.width as number, height = props.height as number;
  const value = props.value as number | null;
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  return (
    <text x={x + width + 6} y={y + height / 2 + 4} fill={isPositive ? "#10b981" : "#ef4444"} fontSize={11} fontWeight={600}>
      {isPositive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </text>
  );
};

export default function ProductTabView({
  products,
  years,
  selectedYear,
}: {
  products: Product[];
  years: number[];
  selectedYear: string;
}) {
  const currentYr = selectedYear === "ALL" ? Math.max(...years) : parseInt(selectedYear);
  const prevYr = currentYr - 1;

  const teams = useMemo(
    () => [...new Set(products.map((p) => p.home_team))].sort(),
    [products]
  );

  // Summary: unique product count + revenue by team for selected year
  const teamSummary = useMemo(() => {
    const filtered = selectedYear === "ALL" ? products : products.filter((p) => p.year === parseInt(selectedYear));
    return teams.map((team) => {
      const teamRows = filtered.filter((p) => p.home_team === team);
      return {
        team,
        count: new Set(teamRows.map((p) => p.material_id)).size,
        amount: Math.round(teamRows.reduce((s, p) => s + p.amount, 0)),
      };
    });
  }, [products, teams, selectedYear]);

  // Product count trend by year+team (stacked bar)
  const countChartData = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of products) {
      const k = `${p.year}|${p.home_team}`;
      if (!map.has(k)) map.set(k, new Set());
      map.get(k)!.add(p.material_id);
    }
    return years.map((year) => {
      const row: Record<string, number | string> = { year: String(year) };
      for (const team of teams) row[team] = map.get(`${year}|${team}`)?.size ?? 0;
      return row;
    });
  }, [products, years, teams]);

  // Top products revenue comparison (current vs prev year)
  const compareData = useMemo(() => {
    const productMap = new Map<string, { material: string; current: number; prev: number }>();
    for (const p of products) {
      if (p.year !== currentYr && p.year !== prevYr) continue;
      if (!productMap.has(p.material_id))
        productMap.set(p.material_id, { material: p.material, current: 0, prev: 0 });
      const entry = productMap.get(p.material_id)!;
      if (p.year === currentYr) entry.current += p.amount;
      else entry.prev += p.amount;
    }
    return Array.from(productMap.values())
      .sort((a, b) => b.current - a.current)
      .slice(0, 12)
      .map((p) => ({
        name: p.material.length > 22 ? p.material.slice(0, 22) + "…" : p.material,
        [`${prevYr}년`]: Math.round(p.prev),
        [`${currentYr}년`]: Math.round(p.current),
        change: p.prev > 0 ? ((p.current - p.prev) / p.prev) * 100 : null,
      }));
  }, [products, currentYr, prevYr]);

  const compareChartHeight = Math.max(200, compareData.length * 40 * 2 + 60);

  return (
    <div className="space-y-5">
      {/* Team summary cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {teamSummary.map((t) => (
          <div key={t.team} className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TEAM_COLORS[t.team] }} />
              <span className="text-xs font-semibold text-gray-600">{t.team}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {t.count.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-1">종</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{formatAmount(t.amount)} 원</div>
          </div>
        ))}
      </div>

      {/* Product count trend */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">연도별 취급 제품 수</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={countChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              formatter={(v, name) => [`${v} 종`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            {teams.map((team) => (
              <Bar key={team} dataKey={team} fill={TEAM_COLORS[team] || "#94a3b8"} radius={[3, 3, 0, 0]} stackId="a" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top product revenue comparison */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-700">Top 제품 매출 증감</h3>
          <span className="text-xs text-gray-400">{prevYr}년 → {currentYr}년 비교</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">전체 기간 기준 Top 12 제품</p>
        <ResponsiveContainer width="100%" height={compareChartHeight}>
          <BarChart
            layout="vertical"
            data={compareData}
            margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAmount} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            <Bar dataKey={`${prevYr}년`} fill="#e5e7eb" radius={[0, 3, 3, 0]} />
            <Bar dataKey={`${currentYr}년`} fill="#6366f1" radius={[0, 3, 3, 0]}>
              <LabelList dataKey="change" content={ChangeLabel as never} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
