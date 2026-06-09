"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getInventory, getDashboardStats, getPurchaseOrders, getNaverMappings,
  type InventoryItem, type PurchaseOrder, type NaverMapping,
} from "@/lib/heartain-db";

const LOW_STOCK = 20;

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function LastSyncInfo() {
  const [log, setLog] = useState<any>(null);

  useEffect(() => {
    fetch("/api/heartain/sync-orders")
      .then((r) => r.json())
      .then((data) => setLog(data?.[0] ?? null))
      .catch(() => {});
  }, []);

  if (!log) return null;

  const when = new Date(log.synced_at).toLocaleString("ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="text-xs text-gray-400 text-right">
      <span className="text-gray-500">네이버 동기화</span>
      <br />
      <span>{when} · {log.orders_processed}건 처리</span>
    </div>
  );
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [mappings, setMappings] = useState<NaverMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, st, po, mp] = await Promise.all([
        getInventory(),
        getDashboardStats(),
        getPurchaseOrders("ordered"),
        getNaverMappings(),
      ]);
      setInventory(inv);
      setStats(st);
      setOrders(po);
      setMappings(mp);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // productId → naver 상품명 목록
  const naverNames: Record<number, string[]> = {};
  for (const m of mappings) {
    if (!naverNames[m.product_id]) naverNames[m.product_id] = [];
    const label = m.naver_option_name
      ? `${m.naver_product_name} [${m.naver_option_name}]`
      : m.naver_product_name;
    if (!naverNames[m.product_id].includes(label)) {
      naverNames[m.product_id].push(label);
    }
  }

  const displayed = filter === "low"
    ? inventory.filter((i) => i.quantity <= LOW_STOCK)
    : inventory;

  const lowCount = inventory.filter((i) => i.quantity <= LOW_STOCK).length;

  const orderMap: Record<number, PurchaseOrder[]> = {};
  for (const o of orders) {
    if (!orderMap[o.product_id]) orderMap[o.product_id] = [];
    orderMap[o.product_id].push(o);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">재고 현황</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 기준
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LastSyncInfo />
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="총 재고 수량" value={stats.totalStock.toLocaleString()} sub="개" />
          <StatCard label="오늘 매출" value={`${stats.todayRevenue.toLocaleString()}원`} />
          <StatCard label="이달 매출" value={`${stats.monthRevenue.toLocaleString()}원`} />
          <StatCard label="이달 수익" value={`${stats.monthProfit.toLocaleString()}원`} />
        </div>
      )}

      {orders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">
            📦 발주 진행 중 ({orders.length}건)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {orders.map((o) => {
              const daysLeft = Math.ceil(
                (new Date(o.expected_arrival).getTime() - new Date(today).getTime()) / 86400000
              );
              const isOverdue = daysLeft < 0;
              const isSoon = daysLeft >= 0 && daysLeft <= 7;
              return (
                <div
                  key={o.id}
                  className={`bg-white rounded-lg px-3 py-2.5 border text-sm ${
                    isOverdue ? "border-red-200" : isSoon ? "border-amber-300" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{(o.product as any)?.name ?? "-"}</span>
                    <span className="text-gray-500 text-xs">{o.quantity}개</span>
                  </div>
                  <div className={`text-xs mt-1 font-medium ${
                    isOverdue ? "text-red-600" : isSoon ? "text-amber-600" : "text-gray-500"
                  }`}>
                    입고 예정: {o.expected_arrival}
                    {isOverdue ? ` (${Math.abs(daysLeft)}일 지연)` : ` (${daysLeft}일 후)`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "all" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          전체 ({inventory.length})
        </button>
        <button
          onClick={() => setFilter("low")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "low" ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          재고 부족 ({lowCount})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-3 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium">제품명 / 스마트스토어 상품명</th>
                <th className="text-right px-4 py-3 font-medium">현재 재고</th>
                <th className="text-left px-4 py-3 font-medium">발주 현황</th>
                <th className="text-right px-4 py-3 font-medium">원가</th>
                <th className="text-right px-4 py-3 font-medium">판매가</th>
                <th className="text-right px-4 py-3 font-medium">마진</th>
                <th className="text-right px-4 py-3 font-medium">마진율</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((item, idx) => {
                const isLow = item.quantity <= LOW_STOCK;
                const marginRate =
                  item.selling_price && item.margin
                    ? Math.round((item.margin / item.selling_price) * 100)
                    : null;
                const itemOrders = orderMap[item.id] ?? [];
                const itemNaverNames = naverNames[item.id] ?? [];

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      isLow ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-right text-gray-300 text-xs font-mono select-none">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{item.name}</span>
                        {isLow && (
                          <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-medium">
                            부족
                          </span>
                        )}
                      </div>
                      {itemNaverNames.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {itemNaverNames.map((n, i) => (
                            <p key={i} className="text-xs text-gray-400 leading-tight">
                              {n}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${isLow ? "text-red-600" : "text-gray-900"}`}>
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {itemOrders.length > 0 ? (
                        <div className="space-y-0.5">
                          {itemOrders.map((o) => {
                            const daysLeft = Math.ceil(
                              (new Date(o.expected_arrival).getTime() - new Date(today).getTime()) / 86400000
                            );
                            return (
                              <div key={o.id} className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
                                {o.quantity}개 · {daysLeft >= 0 ? `${daysLeft}일 후` : `${Math.abs(daysLeft)}일 지연`} ({o.expected_arrival})
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {item.cost_krw ? `${item.cost_krw.toLocaleString()}원` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {item.selling_price ? `${item.selling_price.toLocaleString()}원` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      {item.margin ? `${item.margin.toLocaleString()}원` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {marginRate != null ? `${marginRate}%` : "-"}
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    {filter === "low" ? "재고 부족 제품 없음" : "제품 없음"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
