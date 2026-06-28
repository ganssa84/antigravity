"use client";

import { useEffect, useState, useMemo } from "react";
import { getSalesByDateRange } from "@/lib/heartain-db";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LabelList,
} from "recharts";

type Period = "daily" | "weekly" | "monthly" | "yearly";
type ViewMode = "amount" | "quantity";

interface SaleRow {
  sale_date: string;
  quantity: number;
  coupon_discount: number;
  product: {
    name: string;
    selling_price: number | null;
    margin: number | null;
    cost_krw: number | null;
  } | null;
}

const COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
  "#0891b2", "#be185d", "#65a30d", "#0f766e", "#c2410c",
  "#7e22ce", "#b45309", "#0284c7", "#047857", "#991b1b",
  "#92400e", "#1e40af", "#4d7c0f", "#831843", "#134e4a",
  "#1e3a5f", "#713f12", "#064e3b", "#500724", "#1c1917",
];

const PERIOD_LABELS: Record<Period, string> = {
  daily: "일별", weekly: "주별", monthly: "월별", yearly: "년도별",
};

const BUSINESS_START = "2025-12-01";

function getAllPeriodKeys(fromDate: string, toDate: string, period: Period): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  let cursor = new Date(fromDate + "T00:00:00");
  const end = new Date(toDate + "T00:00:00");
  while (cursor <= end) {
    const key = getPeriodKey(cursor.toISOString().split("T")[0], period);
    if (!seen.has(key)) { seen.add(key); keys.push(key); }
    if (period === "daily") cursor.setDate(cursor.getDate() + 1);
    else if (period === "weekly") cursor.setDate(cursor.getDate() + 7);
    else if (period === "monthly") cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setFullYear(cursor.getFullYear() + 1);
  }
  return keys;
}

function getPeriodKey(date: string, period: Period): string {
  if (period === "daily") return date;
  if (period === "yearly") return date.slice(0, 4);
  if (period === "monthly") return date.slice(0, 7);
  const d = new Date(date + "T00:00:00");
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function formatLabel(key: string, period: Period): string {
  if (period === "yearly") return key;
  if (period === "monthly") {
    const [y, m] = key.split("-");
    return `${y.slice(2)}/${m}`;
  }
  const [, m, d] = key.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function fmtAmt(n: number): string {
  return `${Math.round(n).toLocaleString()}원`;
}

function fmtBarLabel(v: number, viewMode: ViewMode): string {
  if (v <= 0) return "";
  if (viewMode === "quantity") return `${Math.round(v)}`;
  return Math.round(v).toLocaleString();
}

const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.find((p: any) => p.dataKey === "__total__");
  const items = payload
    .filter((p: any) => p.dataKey !== "__total__" && (p.value ?? 0) > 0)
    .sort((a: any, b: any) => b.value - a.value);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {items.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: p.fill }} />
            <span className="text-gray-600">{p.name}</span>
          </span>
          <span className="font-medium text-gray-800">
            {viewMode === "amount" ? fmtAmt(p.value) : `${p.value}개`}
          </span>
        </div>
      ))}
      {total && items.length > 1 && (
        <div className="flex justify-between gap-4 mt-1.5 pt-1.5 border-t border-gray-100">
          <span className="font-semibold text-gray-700">합계</span>
          <span className="font-bold text-gray-900">
            {viewMode === "amount" ? fmtAmt(total.value) : `${total.value}개`}
          </span>
        </div>
      )}
    </div>
  );
};

export default function AnalyticsPage() {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const monthStart = useMemo(() => today.slice(0, 7) + "-01", [today]);
  const [period, setPeriod] = useState<Period>("daily");
  const [viewMode, setViewMode] = useState<ViewMode>("quantity");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [raw, setRaw] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setHighlighted(null);
    getSalesByDateRange(fromDate, toDate)
      .then((data) => setRaw(data as unknown as SaleRow[]))
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  useEffect(() => {
    fetch("/api/heartain/sync-orders")
      .then((r) => r.json())
      .then((logs) => {
        if (logs?.[0]?.synced_at) {
          const d = new Date(logs[0].synced_at);
          setLastSync(d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }));
        }
      })
      .catch(() => {});
  }, []);

  // 모든 제품을 매출 기준으로 정렬
  const chartKeys = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of raw) {
      const name = row.product?.name ?? "기타";
      totals[name] = (totals[name] ?? 0) + row.quantity * (row.product?.selling_price ?? 0);
    }
    return Object.entries(totals).sort(([, a], [, b]) => b - a).map(([name]) => name);
  }, [raw]);

  // 기간별 차트 데이터 (빈 기간 포함)
  const chartData = useMemo(() => {
    const allKeys = getAllPeriodKeys(fromDate, toDate, period);
    const byPeriod: Record<string, Record<string, number>> = {};
    for (const key of allKeys) byPeriod[key] = {};

    for (const row of raw) {
      const key = getPeriodKey(row.sale_date, period);
      if (!byPeriod[key]) byPeriod[key] = {};
      const name = row.product?.name ?? "기타";
      const val =
        viewMode === "amount"
          ? row.quantity * (row.product?.selling_price ?? 0) - (row.coupon_discount ?? 0)
          : row.quantity;
      byPeriod[key][name] = (byPeriod[key][name] ?? 0) + Math.max(0, val);
    }

    return allKeys.map((key) => {
      const vals = byPeriod[key];
      const total = Object.values(vals).reduce((s, v) => s + v, 0);
      return { label: formatLabel(key, period), ...vals, __total__: total, __label__: 0 };
    });
  }, [raw, period, viewMode, fromDate, toDate]);

  // 하이라이트 시: 해당 제품만 남기고 나머지 0으로 → 항상 0 기준에서 시작
  const displayData = useMemo(() => {
    if (!highlighted) return chartData;
    return chartData.map((row) => {
      const val = (row as any)[highlighted] ?? 0;
      const result: Record<string, any> = { label: row.label, __total__: val, __label__: 0 };
      for (const key of chartKeys) result[key] = key === highlighted ? val : 0;
      return result;
    });
  }, [chartData, highlighted, chartKeys]);

  // 요약 통계
  const totalActualRevenue = useMemo(
    () => raw.reduce((s, r) => s + r.quantity * (r.product?.selling_price ?? 0) - (r.coupon_discount ?? 0), 0),
    [raw]
  );
  const totalCoupon = useMemo(() => raw.reduce((s, r) => s + (r.coupon_discount ?? 0), 0), [raw]);
  const totalCost = useMemo(() => raw.reduce((s, r) => s + r.quantity * (r.product?.cost_krw ?? 0), 0), [raw]);
  const totalProfit = useMemo(
    () => raw.reduce((s, r) => s + r.quantity * (r.product?.margin ?? 0) - (r.coupon_discount ?? 0), 0),
    [raw]
  );
  const totalUnits = useMemo(() => raw.reduce((s, r) => s + r.quantity, 0), [raw]);

  // 제품별 상세 통계
  const productStats = useMemo(() => {
    const stats: Record<string, { name: string; units: number; revenue: number; coupon: number; cost: number; profit: number }> = {};
    for (const row of raw) {
      const name = row.product?.name ?? "기타";
      if (!stats[name]) stats[name] = { name, units: 0, revenue: 0, coupon: 0, cost: 0, profit: 0 };
      stats[name].units += row.quantity;
      stats[name].revenue += row.quantity * (row.product?.selling_price ?? 0) - (row.coupon_discount ?? 0);
      stats[name].coupon += row.coupon_discount ?? 0;
      stats[name].cost += row.quantity * (row.product?.cost_krw ?? 0);
      stats[name].profit += row.quantity * (row.product?.margin ?? 0) - (row.coupon_discount ?? 0);
    }
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [raw]);

  const handleLegendClick = (data: any) => {
    const key = data.dataKey ?? data.value;
    if (key === "__total__" || key === "합계") { setHighlighted(null); return; }
    setHighlighted((prev) => (prev === key ? null : key));
  };

  const xAxisInterval =
    period === "daily" ? Math.max(Math.floor(chartData.length / 10), 6) : "preserveStartEnd";

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">매출 분석</h1>
          {lastSync && (
            <span className="text-xs text-gray-400">마지막 동기화 {lastSync}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 날짜 직접 선택 */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm shadow-sm">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={fromDate}
              min={BUSINESS_START}
              max={toDate}
              onChange={(e) => { if (e.target.value) setFromDate(e.target.value); }}
              className="text-gray-700 outline-none cursor-pointer bg-transparent"
            />
            <span className="text-gray-300">–</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={(e) => { if (e.target.value) setToDate(e.target.value); }}
              className="text-gray-700 outline-none cursor-pointer bg-transparent"
            />
            {(fromDate !== monthStart || toDate !== today) && (
              <button
                onClick={() => { setFromDate(monthStart); setToDate(today); }}
                className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
              >
                초기화
              </button>
            )}
          </div>
          {/* 금액/판매량 토글 */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-1">
            {(["amount", "quantity"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "amount" ? "금액" : "판매량"}
              </button>
            ))}
          </div>
          {/* 기간 탭 */}
          <div className="flex gap-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">실제 매출</p>
          <p className="text-2xl font-bold text-gray-900">{fmtAmt(totalActualRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{totalUnits}개 판매</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">쿠폰 할인</p>
          <p className={`text-2xl font-bold ${totalCoupon > 0 ? "text-red-500" : "text-gray-400"}`}>
            {totalCoupon > 0 ? `-${fmtAmt(totalCoupon)}` : "0원"}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">원가 합계</p>
          <p className="text-2xl font-bold text-gray-500">{fmtAmt(totalCost)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">순수익</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {fmtAmt(totalProfit)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : (
        <>
          {/* 차트 */}
          {chartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-sm font-semibold text-gray-600">
                  {viewMode === "amount" ? "실제 매출 추이" : "판매량 추이"}
                  {highlighted ? ` — ${highlighted}` : " — 제품별"}
                </h2>
                {highlighted && (
                  <button onClick={() => setHighlighted(null)} className="text-xs text-blue-600 hover:text-blue-800">
                    전체 보기
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {highlighted ? "범례 다른 항목 클릭 → 전환 · 같은 항목 클릭 → 전체" : "범례 항목 클릭 → 0 기준 단독 비교"}
              </p>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={displayData} margin={{ left: 10, right: 10, top: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      viewMode === "amount" ? Math.round(v).toLocaleString() : `${v}`
                    }
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 8 }}
                    content={(props: any) => {
                      const items: any[] = props.payload ?? [];
                      const sorted = chartKeys
                        .map((key) => items.find((p) => p.value === key))
                        .filter(Boolean);
                      return (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", justifyContent: "center", fontSize: 12, cursor: "pointer" }}>
                          {sorted.map((entry) => (
                            <span
                              key={entry.value}
                              onClick={() => handleLegendClick(entry)}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                opacity: highlighted && highlighted !== entry.value ? 0.3 : 1,
                                fontWeight: highlighted === entry.value ? 600 : 400,
                                transition: "opacity 0.15s",
                              }}
                            >
                              <span style={{ width: 10, height: 10, background: entry.color, borderRadius: 2, flexShrink: 0, display: "inline-block" }} />
                              {entry.value}
                            </span>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {chartKeys.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      stackId="stack"
                      fill={COLORS[i % COLORS.length]}
                      radius={
                        highlighted === key
                          ? [3, 3, 0, 0]
                          : !highlighted && i === chartKeys.length - 1
                          ? [3, 3, 0, 0]
                          : undefined
                      }
                    />
                  ))}
                  {/* 항상 스택 맨 위에 올라가는 투명 bar — 전체 합계 레이블 전용 */}
                  <Bar
                    dataKey="__label__"
                    stackId="stack"
                    fill="transparent"
                    legendType="none"
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="__total__"
                      position="top"
                      formatter={(v: any) => fmtBarLabel(Number(v), viewMode)}
                      style={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 제품별 상세 테이블 */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-600">제품별 상세</h2>
              <p className="text-xs text-gray-400 mt-0.5">실제 매출 = 판매가 × 수량 − 쿠폰 할인</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-left px-4 py-3 font-medium">제품</th>
                    <th className="text-right px-4 py-3 font-medium">판매량</th>
                    <th className="text-right px-4 py-3 font-medium">실제 매출</th>
                    <th className="text-right px-4 py-3 font-medium">쿠폰 할인</th>
                    <th className="text-right px-4 py-3 font-medium">원가</th>
                    <th className="text-right px-4 py-3 font-medium">순수익</th>
                    <th className="text-right px-4 py-3 font-medium">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {productStats.map((p) => (
                    <tr key={p.name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.units}개</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-medium">
                        {p.revenue.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-right text-red-500">
                        {p.coupon > 0 ? `-${p.coupon.toLocaleString()}원` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {p.cost > 0 ? `${p.cost.toLocaleString()}원` : "-"}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${p.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {p.profit.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {totalActualRevenue > 0 ? `${Math.round((p.revenue / totalActualRevenue) * 100)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                  {productStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">판매 데이터가 없습니다</td>
                    </tr>
                  )}
                  {productStats.length > 0 && (
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                      <td className="px-4 py-3 text-gray-700">합계</td>
                      <td className="px-4 py-3 text-right text-gray-700">{totalUnits}개</td>
                      <td className="px-4 py-3 text-right text-gray-900">{totalActualRevenue.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-right text-red-500">
                        {totalCoupon > 0 ? `-${totalCoupon.toLocaleString()}원` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{totalCost.toLocaleString()}원</td>
                      <td className={`px-4 py-3 text-right ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {totalProfit.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">100%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
