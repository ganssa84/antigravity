"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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

type BrnMonthlyRow = { brn: string; year: number; month: number; amount: number };
type ProductRow = { brn: string; material: string; material_id: string; year: number; amount: number };

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만`;
  return v.toLocaleString();
}

type GrowthItem = { material: string; material_id: string; currentAmount: number; prevAmount: number; changePct: number };

export default function TeamMarketplaceChart({
  brnMonthly,
  partnerProducts,
  allYears,
}: {
  brnMonthly: BrnMonthlyRow[];
  partnerProducts: ProductRow[];
  allYears: number[];
}) {
  const [selectedBrn, setSelectedBrn] = useState<string | null>(null);

  const { chartData, brnStats, activeBrns, maxMonth } = useMemo(() => {
    const byBrnMonth = new Map<string, number>();
    for (const r of brnMonthly) {
      if (!MARKETPLACE_BRNS.includes(r.brn as typeof MARKETPLACE_BRNS[number])) continue;
      const k = `${r.brn}|${r.year}|${r.month}`;
      byBrnMonth.set(k, (byBrnMonth.get(k) ?? 0) + r.amount);
    }

    // Detect partial latest year
    const latestYear = allYears[allYears.length - 1] ?? 0;
    const prevYear = allYears[allYears.length - 2] ?? 0;
    const latestMonthsSet = new Set(brnMonthly.filter(r => r.year === latestYear).map(r => r.month));
    const maxMonth = latestMonthsSet.size > 0 ? Math.max(...latestMonthsSet) : 12;
    const isPartial = maxMonth < 12;

    const activeBrns = MARKETPLACE_BRNS.filter(brn =>
      allYears.some(y => {
        const maxM = y === latestYear ? maxMonth : 12;
        for (let m = 1; m <= maxM; m++) {
          if ((byBrnMonth.get(`${brn}|${y}|${m}`) ?? 0) > 0) return true;
        }
        return false;
      })
    );

    // Build month-by-month time series
    const allMonthKeys: string[] = [];
    for (const y of allYears) {
      const maxM = y === latestYear ? maxMonth : 12;
      for (let m = 1; m <= maxM; m++) {
        allMonthKeys.push(`${y}-${String(m).padStart(2, "0")}`);
      }
    }

    const chartData = allMonthKeys.map(key => {
      const [yearStr, monthStr] = key.split("-");
      const y = parseInt(yearStr);
      const m = parseInt(monthStr);
      const row: Record<string, number | string> = { month: key };
      for (const brn of activeBrns) {
        row[MARKETPLACE_NAMES[brn] || brn] = byBrnMonth.get(`${brn}|${y}|${m}`) ?? 0;
      }
      return row;
    });

    // YoY chips: for partial latest year, compare same months vs prior year
    const compareMonths = isPartial
      ? Array.from({ length: maxMonth }, (_, i) => i + 1)
      : Array.from({ length: 12 }, (_, i) => i + 1);

    const brnStats = activeBrns.map(brn => {
      const name = MARKETPLACE_NAMES[brn] || brn;
      const current = compareMonths.reduce((s, m) => s + (byBrnMonth.get(`${brn}|${latestYear}|${m}`) ?? 0), 0);
      const prev = prevYear
        ? compareMonths.reduce((s, m) => s + (byBrnMonth.get(`${brn}|${prevYear}|${m}`) ?? 0), 0)
        : 0;
      const yoy = prev > 0 ? (current - prev) / prev * 100 : null;
      return { brn, name, current, prev, yoy, isPartial };
    }).filter(s => s.current > 0 || s.prev > 0);

    return { chartData, brnStats, activeBrns, maxMonth };
  }, [brnMonthly, allYears]);

  const { topGrowing, topDeclining, targetYear, prevYear } = useMemo(() => {
    if (!selectedBrn) return { topGrowing: [] as GrowthItem[], topDeclining: [] as GrowthItem[], targetYear: 0, prevYear: 0 };

    const brnProd = partnerProducts.filter(r => r.brn === selectedBrn);
    const years = [...new Set(brnProd.map(r => r.year))].sort();
    const targetYear = years.at(-1) ?? 0;
    const prevYear = years.at(-2) ?? 0;
    if (!prevYear) return { topGrowing: [], topDeclining: [], targetYear, prevYear };

    const curMap = new Map<string, { material: string; amount: number }>();
    const prevMap = new Map<string, { material: string; amount: number }>();
    for (const r of brnProd) {
      const map = r.year === targetYear ? curMap : r.year === prevYear ? prevMap : null;
      if (!map) continue;
      const ex = map.get(r.material_id);
      if (ex) ex.amount += r.amount;
      else map.set(r.material_id, { material: r.material, amount: r.amount });
    }

    const items: GrowthItem[] = [];
    for (const [mid, cur] of curMap) {
      const prev = prevMap.get(mid);
      if (!prev || prev.amount === 0 || cur.amount < 3_000_000) continue;
      items.push({
        material: cur.material, material_id: mid,
        currentAmount: cur.amount, prevAmount: prev.amount,
        changePct: (cur.amount - prev.amount) / prev.amount * 100,
      });
    }

    return {
      topGrowing: items.filter(g => g.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 8),
      topDeclining: items.filter(g => g.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 8),
      targetYear,
      prevYear,
    };
  }, [selectedBrn, partnerProducts]);

  if (brnStats.length === 0) return null;

  const selectedName = selectedBrn ? (MARKETPLACE_NAMES[selectedBrn] || selectedBrn) : null;

  // X-axis: show only Jan (year label) and quarterly marks (4, 7, 10)
  const quarterlyTicks = chartData
    .filter(d => { const m = parseInt(String(d.month).split("-")[1]); return m === 1 || m === 4 || m === 7 || m === 10; })
    .map(d => String(d.month));

  const tickFormatter = (key: string) => {
    const parts = key.split("-");
    const m = parseInt(parts[1]);
    if (m === 1) return `${parts[0]}년`;
    return `${m}월`;
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">마켓플레이스별 매출 추이</h3>
      <p className="text-xs text-gray-400 mb-4">채널별 월별 매출 · 채널 클릭 시 제품 증감 분석</p>

      {/* YoY 채널 칩 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {brnStats.map(({ brn, name, current, yoy, isPartial }) => {
          const isSelected = selectedBrn === brn;
          return (
            <button
              key={brn}
              onClick={() => setSelectedBrn(prev => prev === brn ? null : brn)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MP_COLORS[brn] }} />
              {name}
              <span className={isSelected ? "text-indigo-200" : "text-gray-500"}>
                {formatAmount(current)}원{isPartial && ` (1~${maxMonth}월)`}
              </span>
              {yoy !== null && (
                <span className={isSelected ? "text-white font-bold" : yoy >= 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                  {yoy >= 0 ? "▲" : "▼"}{Math.abs(yoy).toFixed(1)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 월별 추이 라인 차트 */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="month"
            ticks={quarterlyTicks}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={tickFormatter}
          />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAmount} width={48} />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 12 }}
            labelFormatter={(label) => {
              const parts = String(label).split("-");
              return `${parts[0]}년 ${parseInt(parts[1])}월`;
            }}
            formatter={(v, name) => [`${formatAmount(v as number)}원`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
          {activeBrns.map(brn => (
            <Line
              key={brn}
              type="monotone"
              dataKey={MARKETPLACE_NAMES[brn] || brn}
              stroke={MP_COLORS[brn]}
              strokeWidth={selectedBrn && selectedBrn !== brn ? 1 : 2.5}
              strokeOpacity={selectedBrn && selectedBrn !== brn ? 0.3 : 1}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* 제품 증감 드릴다운 */}
      {selectedBrn && (topGrowing.length > 0 || topDeclining.length > 0) && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-700">
              <span className="text-indigo-600">{selectedName}</span> 제품 YoY 증감
              <span className="ml-1.5 text-gray-400 font-normal">{prevYear} → {targetYear}</span>
            </p>
            <button onClick={() => setSelectedBrn(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">닫기 ✕</button>
          </div>

          <div className={`grid gap-6 ${topGrowing.length > 0 && topDeclining.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
            {topGrowing.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 mb-2">성장 Top {topGrowing.length}</p>
                <div className="space-y-1.5">
                  {topGrowing.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
                      <span className="text-xs text-gray-700 flex-1 truncate" title={g.material}>{g.material.length > 28 ? g.material.slice(0, 28) + "…" : g.material}</span>
                      <span className="text-xs font-semibold text-emerald-600 shrink-0">▲{g.changePct.toFixed(0)}%</span>
                      <span className="text-xs text-gray-500 shrink-0">{formatAmount(g.currentAmount)}원</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topDeclining.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 mb-2">감소 Top {topDeclining.length}</p>
                <div className="space-y-1.5">
                  {topDeclining.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
                      <span className="text-xs text-gray-700 flex-1 truncate" title={g.material}>{g.material.length > 28 ? g.material.slice(0, 28) + "…" : g.material}</span>
                      <span className="text-xs font-semibold text-red-500 shrink-0">▼{Math.abs(g.changePct).toFixed(0)}%</span>
                      <span className="text-xs text-gray-500 shrink-0">{formatAmount(g.currentAmount)}원</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedBrn && topGrowing.length === 0 && topDeclining.length === 0 && (
        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">비교 가능한 제품 데이터가 없습니다.</p>
          <button onClick={() => setSelectedBrn(null)} className="text-xs text-gray-400 hover:text-gray-600">닫기 ✕</button>
        </div>
      )}
    </div>
  );
}
