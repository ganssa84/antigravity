"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";

type CommodityMonthlyRow = {
  commodity: number; home_team: string; year: number; month: number; amount: number; qty: number;
};

type ProductRow = {
  material: string; material_id: string; commodity: number; amount: number;
};

type Mode = "yearly" | "monthly" | "quarterly";

const YEAR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f87171"];
const LINE_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f87171", "#a78bfa", "#fb923c", "#34d399"];

const QUARTERS = [
  { name: "Q1", months: [1, 2, 3] },
  { name: "Q2", months: [4, 5, 6] },
  { name: "Q3", months: [7, 8, 9] },
  { name: "Q4", months: [10, 11, 12] },
];

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만`;
  return v.toLocaleString();
}

function commLabel(c: number): string {
  return c === 0 ? "미분류" : `C${c}`;
}

export default function CommodityCompareChart({
  data,
  allYears,
  products = [],
}: {
  data: CommodityMonthlyRow[];
  allYears: number[];
  products?: ProductRow[];
}) {
  const [mode, setMode] = useState<Mode>("yearly");
  const maxYear = allYears[allYears.length - 1] ?? new Date().getFullYear();
  const [viewYear, setViewYear] = useState<number>(maxYear);
  const [selectedCommodity, setSelectedCommodity] = useState<number | null>(null);

  const { chartData, topCommodities, yearlyTotals, nameToComm } = useMemo(() => {
    if (mode === "yearly") {
      const totals = new Map<number, number>();
      const byKey = new Map<string, number>();
      const yearTotals = new Map<number, number>();
      for (const r of data) {
        totals.set(r.commodity, (totals.get(r.commodity) ?? 0) + r.amount);
        const k = `${r.commodity}|${r.year}`;
        byKey.set(k, (byKey.get(k) ?? 0) + r.amount);
        yearTotals.set(r.year, (yearTotals.get(r.year) ?? 0) + r.amount);
      }
      const top = Array.from(totals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c]) => c);

      const rows = top.map(c => {
        const row: Record<string, unknown> = { name: commLabel(c) };
        for (const y of allYears) {
          row[`${y}년`] = Math.round(byKey.get(`${c}|${y}`) ?? 0);
        }
        return row;
      });

      const yearlyTotals = allYears.map((y, i) => {
        const amt = yearTotals.get(y) ?? 0;
        const prevAmt = i > 0 ? (yearTotals.get(allYears[i - 1]) ?? 0) : 0;
        const yoy = i === 0 || prevAmt === 0 ? null : ((amt - prevAmt) / prevAmt) * 100;
        return { year: y, amount: amt, yoy };
      });

      const nameToComm = new Map(top.map(c => [commLabel(c), c]));
      return { chartData: rows, topCommodities: top, yearlyTotals, nameToComm };
    }

    const filtered = data.filter(r => r.year === viewYear);
    const yearlyTotals: { year: number; amount: number; yoy: number | null }[] = [];
    const totals = new Map<number, number>();
    for (const r of filtered) totals.set(r.commodity, (totals.get(r.commodity) ?? 0) + r.amount);
    const top = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([c]) => c);

    const nameToComm = new Map(top.map(c => [commLabel(c), c]));

    if (mode === "monthly") {
      const rows = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const row: Record<string, unknown> = { name: `${month}월` };
        for (const c of top) {
          const amt = filtered.filter(r => r.commodity === c && r.month === month).reduce((s, r) => s + r.amount, 0);
          row[commLabel(c)] = Math.round(amt);
        }
        return row;
      });
      return { chartData: rows, topCommodities: top, yearlyTotals, nameToComm };
    }

    const rows = QUARTERS.map(q => {
      const row: Record<string, unknown> = { name: q.name };
      for (const c of top) {
        const amt = filtered.filter(r => r.commodity === c && q.months.includes(r.month)).reduce((s, r) => s + r.amount, 0);
        row[commLabel(c)] = Math.round(amt);
      }
      return row;
    });
    return { chartData: rows, topCommodities: top, yearlyTotals, nameToComm };
  }, [data, allYears, mode, viewYear]);

  const productList = useMemo(() => {
    if (selectedCommodity === null || products.length === 0) return [];
    const map = new Map<string, { material: string; amount: number }>();
    for (const p of products.filter(p => p.commodity === selectedCommodity)) {
      const ex = map.get(p.material_id);
      if (ex) ex.amount += p.amount;
      else map.set(p.material_id, { material: p.material, amount: p.amount });
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [selectedCommodity, products]);

  if (data.length === 0) return null;

  const barSize = mode === "yearly" ? 10 : undefined;
  const yearlyChartHeight = Math.max(280, topCommodities.length * (allYears.length * 12 + 14) + 60);

  const handleYearlyClick = (d: Record<string, unknown>) => {
    const payload = (d?.activePayload as { payload: { name: string } }[] | undefined)?.[0]?.payload;
    if (!payload) return;
    const comm = nameToComm.get(payload.name);
    if (comm === undefined) return;
    setSelectedCommodity(prev => prev === comm ? null : comm);
  };

  const selectedLabel = selectedCommodity !== null ? commLabel(selectedCommodity) : null;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Commodity별 매출</h3>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["yearly", "monthly", "quarterly"] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "yearly" ? "년도별" : m === "monthly" ? "월별" : "분기별"}
            </button>
          ))}
        </div>
      </div>

      {mode !== "yearly" && allYears.length > 1 && (
        <div className="flex gap-1 mt-2 mb-4">
          {allYears.map(y => (
            <button
              key={y}
              onClick={() => setViewYear(y)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewYear === y ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {y}년
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mb-3">
        {mode === "yearly"
          ? `${allYears[0] ?? ""}년 ~ ${allYears[allYears.length - 1] ?? ""}년 · Top 10 Commodity`
          : `${viewYear}년 · Top 8 Commodity`}
        {mode === "yearly" && <span className="ml-2 text-indigo-400">· 바 클릭 시 제품 목록 보기</span>}
      </p>

      {mode === "yearly" && yearlyTotals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {yearlyTotals.map((yt) => (
            <span key={yt.year} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-gray-50 border-gray-200 text-gray-700">
              <span className="text-gray-400">{yt.year}</span>
              <span className="font-semibold">{formatAmount(yt.amount)}원</span>
              {yt.yoy !== null && (
                <span className={yt.yoy >= 0 ? "text-emerald-600" : "text-red-500"}>
                  {yt.yoy >= 0 ? "▲" : "▼"}{Math.abs(yt.yoy).toFixed(1)}%
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {mode === "yearly" ? (
        <ResponsiveContainer width="100%" height={yearlyChartHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="25%"
            onClick={handleYearlyClick}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAmount} />
            <YAxis
              type="category"
              dataKey="name"
              width={56}
              tick={(props) => {
                const { x, y, payload } = props;
                const isSelected = payload.value === selectedLabel;
                return (
                  <text x={x} y={y} textAnchor="end" dominantBaseline="central" fontSize={11}
                    fill={isSelected ? "#6366f1" : "#6b7280"} fontWeight={isSelected ? 700 : 400}>
                    {payload.value}
                  </text>
                );
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            {allYears.map((y, i) => (
              <Bar key={y} dataKey={`${y}년`} fill={YEAR_COLORS[i % YEAR_COLORS.length]} radius={[0, 2, 2, 0]} barSize={barSize} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : mode === "monthly" ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAmount} width={48} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            {topCommodities.map((c, i) => (
              <Line
                key={c}
                type="monotone"
                dataKey={commLabel(c)}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAmount} width={48} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              formatter={(v) => [`${(v as number).toLocaleString()} 원`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            {topCommodities.map((c, i) => (
              <Bar key={c} dataKey={commLabel(c)} fill={LINE_COLORS[i % LINE_COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* 제품 드릴다운 */}
      {selectedCommodity !== null && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-indigo-700">
              {selectedLabel} 제품 목록
              <span className="ml-1.5 text-gray-400 font-normal">({productList.length}종)</span>
            </p>
            <button
              onClick={() => setSelectedCommodity(null)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              닫기 ✕
            </button>
          </div>
          {productList.length === 0 ? (
            <p className="text-xs text-gray-400">제품 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {productList.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 w-5 shrink-0 text-right">{i + 1}</span>
                  <span className="text-xs text-gray-700 flex-1 truncate">{p.material}</span>
                  <span className="text-xs font-semibold text-gray-900 shrink-0">{formatAmount(p.amount)}원</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
