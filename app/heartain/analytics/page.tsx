"use client";

import { useEffect, useState, useMemo } from "react";
import { getSalesByDateRange } from "@/lib/heartain-db";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
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
  "#0891b2", "#be185d", "#65a30d", "#6b7280",
];
const MAX_CHART_PRODUCTS = 8;

const PERIOD_LABELS: Record<Period, string> = {
  daily: "일별", weekly: "주별", monthly: "월별", yearly: "년도별",
};

function computeDateRange(period: Period): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date();
  if (period === "daily") from.setDate(from.getDate() - 29);
  else if (period === "weekly") from.setDate(from.getDate() - 90);
  else if (period === "monthly") from.setMonth(from.getMonth() - 11);
  else from.setFullYear(from.getFullYear() - 4);
  return {
    fromDate: from.toISOString().split("T")[0],
    toDate: to.toISOString().split("T")[0],
  };
}

function getPeriodKey(date: string, period: Period): string {
  if (period === "daily") return date;
  if (period === "yearly") return date.slice(0, 4);
  if (period === "monthly") return date.slice(0, 7);
  // weekly: 해당 주의 월요일
  const d = new Date(date + "T00:00:00");
  const dow = d.getDay(); // 0=Sun
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

const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.find((p: any) => p.dataKey === "__total__");
  const items = payload.filter((p: any) => p.dataKey !== "__total__" && p.value > 0);
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
      {total && (
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
  const [period, setPeriod] = useState<Period>("monthly");
  const [viewMode, setViewMode] = useState<ViewMode>("amount");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [raw, setRaw] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { fromDate, toDate } = useMemo(() => computeDateRange(period), [period]);

  useEffect(() => {
    setLoading(true);
    setHighlighted(null);
    getSalesByDateRange(fromDate, toDate)
      .then((data) => setRaw(data as unknown as SaleRow[]))
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  // 제품별 합계 (차트 상위 제품 선정용)
  const productTotalsByRevenue = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of raw) {
      const name = row.product?.name ?? "기타";
      totals[name] = (totals[name] ?? 0) + row.quantity * (row.product?.selling_price ?? 0);
    }
    return totals;
  }, [raw]);

  const topProducts = useMemo(
    () =>
      Object.entries(productTotalsByRevenue)
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_CHART_PRODUCTS)
        .map(([name]) => name),
    [productTotalsByRevenue]
  );
  const topSet = useMemo(() => new Set(topProducts), [topProducts]);
  const hasOthers = Object.keys(productTotalsByRevenue).length > MAX_CHART_PRODUCTS;
  const chartKeys = hasOthers ? [...topProducts, "기타"] : topProducts;

  // 차트 데이터 빌드
  const chartData = useMemo(() => {
    const byPeriod: Record<string, Record<string, number>> = {};
    for (const row of raw) {
      const key = getPeriodKey(row.sale_date, period);
      if (!byPeriod[key]) byPeriod[key] = {};
      const name = row.product?.name ?? "기타";
      const productKey = topSet.has(name) ? name : "기타";
      const val =
        viewMode === "amount"
          ? row.quantity * (row.product?.selling_price ?? 0) - (row.coupon_discount ?? 0)
          : row.quantity;
      byPeriod[key][productKey] = (byPeriod[key][productKey] ?? 0) + Math.max(0, val);
    }
    return Object.entries(byPeriod)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, vals]) => ({
        label: formatLabel(key, period),
        ...vals,
        __total__: Object.values(vals).reduce((s, v) => s + v, 0),
      }));
  }, [raw, period, viewMode, topSet]);

  // 요약 통계
  const totalActualRevenue = useMemo(
    () => raw.reduce((s, r) => s + r.quantity * (r.product?.selling_price ?? 0) - (r.coupon_discount ?? 0), 0),
    [raw]
  );
  const totalCoupon = useMemo(
    () => raw.reduce((s, r) => s + (r.coupon_discount ?? 0), 0),
    [raw]
  );
  const totalCost = useMemo(
    () => raw.reduce((s, r) => s + r.quantity * (r.product?.cost_krw ?? 0), 0),
    [raw]
  );
  const totalProfit = useMemo(
    () => raw.reduce((s, r) => s + r.quantity * (r.product?.margin ?? 0) - (r.coupon_discount ?? 0), 0),
    [raw]
  );
  const totalUnits = useMemo(() => raw.reduce((s, r) => s + r.quantity, 0), [raw]);

  // 제품별 상세 통계 (테이블용)
  const productStats = useMemo(() => {
    const stats: Record<
      string,
      { name: string; units: number; revenue: number; coupon: number; cost: number; profit: number }
    > = {};
    for (const row of raw) {
      const name = row.product?.name ?? "기타";
      if (!stats[name])
        stats[name] = { name, units: 0, revenue: 0, coupon: 0, cost: 0, profit: 0 };
      const revenue = row.quantity * (row.product?.selling_price ?? 0) - (row.coupon_discount ?? 0);
      stats[name].units += row.quantity;
      stats[name].revenue += revenue;
      stats[name].coupon += row.coupon_discount ?? 0;
      stats[name].cost += row.quantity * (row.product?.cost_krw ?? 0);
      stats[name].profit +=
        row.quantity * (row.product?.margin ?? 0) - (row.coupon_discount ?? 0);
    }
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [raw]);

  const handleLegendClick = (data: any) => {
    const key = data.dataKey ?? data.value;
    if (key === "__total__") {
      setHighlighted(null);
      return;
    }
    setHighlighted((prev) => (prev === key ? null : key));
  };

  const xAxisInterval =
    period === "daily" ? Math.floor(chartData.length / 8) || 0 : "preserveStartEnd";

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">매출 분석</h1>
        <div className="flex items-center gap-2 flex-wrap">
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
                  period === p
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
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
                  {viewMode === "amount" ? "실제 매출 추이" : "판매량 추이"} — 제품별
                </h2>
                {highlighted && (
                  <button
                    onClick={() => setHighlighted(null)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    전체 보기
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">범례 항목 클릭 → 해당 제품 하이라이트</p>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      viewMode === "amount" ? `${Math.round(v / 1000)}K` : `${v}`
                    }
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                  <Legend
                    onClick={handleLegendClick}
                    wrapperStyle={{ cursor: "pointer", fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => (
                      <span
                        style={{
                          opacity: highlighted && highlighted !== value ? 0.35 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        {value === "__total__" ? "합계" : value}
                      </span>
                    )}
                  />
                  {chartKeys.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      stackId="stack"
                      fill={COLORS[i % COLORS.length]}
                      opacity={highlighted && highlighted !== key ? 0.15 : 1}
                      radius={i === chartKeys.length - 1 ? [3, 3, 0, 0] : undefined}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="__total__"
                    name="합계"
                    stroke="#111827"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 3"
                    opacity={highlighted ? 0.3 : 0.8}
                  />
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
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          p.profit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {p.profit.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {totalActualRevenue > 0
                          ? `${Math.round((p.revenue / totalActualRevenue) * 100)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {productStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">
                        판매 데이터가 없습니다
                      </td>
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
