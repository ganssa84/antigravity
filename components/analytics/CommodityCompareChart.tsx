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
  material: string; material_id: string; commodity: number; year: number; amount: number;
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
  selectedYear = "ALL",
}: {
  data: CommodityMonthlyRow[];
  allYears: number[];
  products?: ProductRow[];
  selectedYear?: string;
}) {
  const [mode, setMode] = useState<Mode>("yearly");
  const maxYear = allYears[allYears.length - 1] ?? new Date().getFullYear();
  const [viewYear, setViewYear] = useState<number>(maxYear);
  const [selectedCommodity, setSelectedCommodity] = useState<number | null>(null);

  // When top-level selectedYear prop is set, it overrides the internal year picker
  const effectiveViewYear = selectedYear !== "ALL" ? parseInt(selectedYear) : viewYear;
  // In yearly mode, show only the selected year's bars (or all years if ALL)
  const displayYears = selectedYear !== "ALL" ? [parseInt(selectedYear)] : [...allYears].sort((a, b) => a - b);

  // Detect partial year dynamically from data
  const { latestPartialMonths, dataLatestYear } = useMemo(() => {
    const yearMonths = new Map<number, Set<number>>();
    for (const r of data) {
      if (!yearMonths.has(r.year)) yearMonths.set(r.year, new Set());
      yearMonths.get(r.year)!.add(r.month);
    }
    const latestYear = allYears[allYears.length - 1];
    const months = yearMonths.get(latestYear) ?? new Set<number>();
    return {
      latestPartialMonths: months.size < 12 ? months : null,
      dataLatestYear: latestYear,
    };
  }, [data, allYears]);

  // Main chart data (does not depend on selectedCommodity)
  const { chartData, topCommodities, nameToComm } = useMemo(() => {
    if (mode === "yearly") {
      const totals = new Map<number, number>();
      const byKey = new Map<string, number>();
      for (const r of data) {
        totals.set(r.commodity, (totals.get(r.commodity) ?? 0) + r.amount);
        const k = `${r.commodity}|${r.year}`;
        byKey.set(k, (byKey.get(k) ?? 0) + r.amount);
      }
      const top = Array.from(totals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c]) => c);

      const rows = top.map(c => {
        const row: Record<string, unknown> = { name: commLabel(c) };
        for (const y of displayYears) {
          row[`${y}년`] = Math.round(byKey.get(`${c}|${y}`) ?? 0);
        }
        return row;
      });

      const nameToComm = new Map(top.map(c => [commLabel(c), c]));
      return { chartData: rows, topCommodities: top, nameToComm };
    }

    const filtered = data.filter(r => r.year === effectiveViewYear);
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
      return { chartData: rows, topCommodities: top, nameToComm };
    }

    const rows = QUARTERS.map(q => {
      const row: Record<string, unknown> = { name: q.name };
      for (const c of top) {
        const amt = filtered.filter(r => r.commodity === c && q.months.includes(r.month)).reduce((s, r) => s + r.amount, 0);
        row[commLabel(c)] = Math.round(amt);
      }
      return row;
    });
    return { chartData: rows, topCommodities: top, nameToComm };
  }, [data, allYears, mode, effectiveViewYear, selectedYear, displayYears]);

  // Yearly total chips — when a commodity is selected, show only that commodity's totals.
  // For partial years, compare same months vs prior year for fair YoY.
  const yearlyTotals = useMemo(() => {
    if (mode !== "yearly") return [];

    const filteredData = selectedCommodity !== null
      ? data.filter(r => r.commodity === selectedCommodity)
      : data;

    const yearTotals = new Map<number, number>();
    for (const r of filteredData) {
      yearTotals.set(r.year, (yearTotals.get(r.year) ?? 0) + r.amount);
    }

    return allYears.map((y, i) => {
      const prevYear = i > 0 ? allYears[i - 1] : null;
      let amt: number;
      let prevAmt: number;

      if (latestPartialMonths && y === dataLatestYear) {
        // Partial year: compare same months vs prior year
        amt = filteredData.filter(r => r.year === y && latestPartialMonths.has(r.month)).reduce((s, r) => s + r.amount, 0);
        prevAmt = prevYear
          ? filteredData.filter(r => r.year === prevYear && latestPartialMonths.has(r.month)).reduce((s, r) => s + r.amount, 0)
          : 0;
      } else {
        amt = yearTotals.get(y) ?? 0;
        prevAmt = prevYear ? (yearTotals.get(prevYear) ?? 0) : 0;
      }

      const yoy = i === 0 || prevAmt === 0 ? null : ((amt - prevAmt) / prevAmt) * 100;
      const maxMon = latestPartialMonths && y === dataLatestYear ? Math.max(...latestPartialMonths) : 12;
      return { year: y, amount: amt, yoy, isPartial: latestPartialMonths !== null && y === dataLatestYear, maxMon };
    });
  }, [data, allYears, mode, selectedCommodity, latestPartialMonths, dataLatestYear]);

  // Product list: Top 20 for target year with YoY vs prior year
  const productList = useMemo(() => {
    if (selectedCommodity === null || products.length === 0) return [];

    const rawTargetYear = selectedYear !== "ALL" ? parseInt(selectedYear) : (allYears[allYears.length - 1] ?? 0);
    // When the target year is partial (e.g. 2026 Q1), fall back to last complete year for fair YoY
    const isTargetPartialYear = latestPartialMonths !== null && rawTargetYear === dataLatestYear;
    const targetYear = isTargetPartialYear ? (allYears[allYears.indexOf(dataLatestYear) - 1] ?? rawTargetYear) : rawTargetYear;
    const targetYearIdx = allYears.indexOf(targetYear);
    const prevYear = targetYearIdx > 0 ? allYears[targetYearIdx - 1] : null;

    const commProds = products.filter(p => p.commodity === selectedCommodity);

    const curMap = new Map<string, { material: string; amount: number }>();
    const prevMap = new Map<string, { material: string; amount: number }>();

    for (const p of commProds) {
      if (p.year === targetYear) {
        const ex = curMap.get(p.material_id);
        if (ex) ex.amount += p.amount;
        else curMap.set(p.material_id, { material: p.material, amount: p.amount });
      } else if (prevYear && p.year === prevYear) {
        const ex = prevMap.get(p.material_id);
        if (ex) ex.amount += p.amount;
        else prevMap.set(p.material_id, { material: p.material, amount: p.amount });
      }
    }

    return Array.from(curMap.entries())
      .map(([mid, cur]) => {
        const prev = prevMap.get(mid);
        const yoy = prev && prev.amount > 0 ? ((cur.amount - prev.amount) / prev.amount) * 100 : null;
        return { material: cur.material, material_id: mid, amount: cur.amount, yoy };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20);
  }, [selectedCommodity, products, selectedYear, allYears]);

  if (data.length === 0) return null;

  const barSize = mode === "yearly" ? (displayYears.length === 1 ? 20 : 10) : undefined;
  const yearlyChartHeight = Math.max(280, topCommodities.length * (displayYears.length * 12 + 14) + 60);

  const handleBarClick = (rowData: Record<string, unknown>) => {
    const name = rowData?.name as string | undefined;
    if (!name) return;
    const comm = nameToComm.get(name);
    if (comm === undefined) return;
    setSelectedCommodity(prev => prev === comm ? null : comm);
  };

  const selectedLabel = selectedCommodity !== null ? commLabel(selectedCommodity) : null;

  // Determine which year the product list is showing (skip partial years for fair YoY)
  const rawProductTargetYear = selectedYear !== "ALL" ? parseInt(selectedYear) : (allYears[allYears.length - 1] ?? 0);
  const productTargetYear = (latestPartialMonths !== null && rawProductTargetYear === dataLatestYear)
    ? (allYears[allYears.indexOf(dataLatestYear) - 1] ?? rawProductTargetYear)
    : rawProductTargetYear;
  const productPrevYear = (() => {
    const idx = allYears.indexOf(productTargetYear);
    return idx > 0 ? allYears[idx - 1] : null;
  })();

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

      {/* Internal year picker: only show when not controlled by top filter */}
      {mode !== "yearly" && allYears.length > 1 && selectedYear === "ALL" && (
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
          ? `${displayYears[0] ?? ""}${displayYears.length > 1 ? `년 ~ ${displayYears[displayYears.length - 1]}` : ""}년 · Top 10 Commodity`
          : `${effectiveViewYear}년 · Top 8 Commodity`}
        {mode === "yearly" && <span className="ml-2 text-indigo-400">· 바 클릭 시 제품 목록 보기</span>}
      </p>

      {mode === "yearly" && yearlyTotals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {yearlyTotals.map((yt) => (
            <span key={yt.year} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium bg-gray-50 border-gray-200 text-gray-700">
              <span className="text-gray-400">{yt.year}{yt.isPartial && <span className="text-gray-300"> 1~{yt.maxMon}월</span>}</span>
              <span className="font-semibold">{formatAmount(yt.amount)}원</span>
              {yt.yoy !== null && (
                <span className={yt.yoy >= 0 ? "text-emerald-600" : "text-red-500"}>
                  {yt.yoy >= 0 ? "▲" : "▼"}{Math.abs(yt.yoy).toFixed(1)}%
                </span>
              )}
            </span>
          ))}
          {selectedCommodity !== null && (
            <button
              onClick={() => setSelectedCommodity(null)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 transition-colors"
            >
              전체 보기
            </button>
          )}
        </div>
      )}

      {mode === "yearly" ? (
        <div key={displayYears.join("-")}>
        <ResponsiveContainer width="100%" height={yearlyChartHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="25%"
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
            {displayYears.map((y) => {
              const colorIdx = allYears.indexOf(y);
              return (
                <Bar
                  key={y}
                  dataKey={`${y}년`}
                  fill={YEAR_COLORS[colorIdx % YEAR_COLORS.length]}
                  radius={[0, 2, 2, 0]}
                  barSize={barSize}
                  style={{ cursor: "pointer" }}
                  onClick={(d) => handleBarClick(d as unknown as Record<string, unknown>)}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
        </div>
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
              {selectedLabel} 제품 Top 20
              <span className="ml-1.5 text-gray-400 font-normal">
                {productTargetYear}년{productPrevYear && ` · vs ${productPrevYear}년 YoY`}
              </span>
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
                  <span className="text-xs text-gray-700 flex-1 truncate" title={p.material}>{p.material}</span>
                  <span className="text-xs font-semibold text-gray-900 shrink-0">{formatAmount(p.amount)}원</span>
                  {p.yoy !== null ? (
                    <span className={`text-xs font-semibold shrink-0 w-16 text-right ${p.yoy >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {p.yoy >= 0 ? "▲" : "▼"}{Math.abs(p.yoy).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 shrink-0 w-16 text-right">신규</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
