"use client";

import { useEffect, useState } from "react";
import {
  getProducts, getPurchaseOrders, addPurchaseOrder, markPurchaseOrderArrived,
  type Product, type PurchaseOrder,
} from "@/lib/heartain-db";

export default function OrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ordered" | "arrived">("ordered");

  // 발주 폼
  const [productId, setProductId] = useState<number>(0);
  const [qty, setQty] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 입고 확인 중인 ID
  const [arrivingId, setArrivingId] = useState<number | null>(null);

  const reload = async () => {
    const [p, o] = await Promise.all([getProducts(), getPurchaseOrders()]);
    setProducts(p);
    setOrders(o);
    if (p.length > 0 && productId === 0) setProductId(p[0].id);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !qty) return;
    setSaving(true);
    setMessage(null);
    try {
      await addPurchaseOrder(productId, parseInt(qty, 10), orderDate, note || undefined);
      await reload();
      setQty("");
      setNote("");
      const arrival = new Date(orderDate);
      arrival.setDate(arrival.getDate() + 40);
      setMessage({ type: "ok", text: `발주 등록 완료 — 입고 예정일: ${arrival.toLocaleDateString("ko-KR")}` });
    } catch (e: any) {
      setMessage({ type: "err", text: e.message ?? "저장 실패" });
    } finally {
      setSaving(false);
    }
  };

  const handleArrived = async (id: number) => {
    setArrivingId(id);
    try {
      const today = new Date().toISOString().split("T")[0];
      await markPurchaseOrderArrived(id, today);
      await reload();
    } catch (e: any) {
      alert(`오류: ${e.message}`);
    } finally {
      setArrivingId(null);
    }
  };

  const filtered = orders.filter((o) => o.status === filter);
  const today = new Date().toISOString().split("T")[0];

  // 예정일까지 남은 일수
  const daysUntil = (date: string) =>
    Math.ceil((new Date(date).getTime() - new Date(today).getTime()) / 86400000);

  if (loading) return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">발주 관리</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 발주 등록 폼 */}
        <form onSubmit={handleOrder} className="lg:col-span-2 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 mb-1">발주 안내</p>
            <p className="text-xs text-blue-600">
              중국 제조사 발주 후 평균 <strong>40일</strong> 후 입고됩니다.
              발주 등록 시 입고 예정일이 자동 계산됩니다.
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">제품</label>
            <select value={productId} onChange={(e) => setProductId(Number(e.target.value))}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">발주 수량</label>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
              placeholder="수량"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">발주 날짜</label>
            <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {orderDate && (
              <p className="text-xs text-gray-400 mt-1">
                입고 예정일:{" "}
                <span className="text-blue-600 font-medium">
                  {(() => {
                    const d = new Date(orderDate);
                    d.setDate(d.getDate() + 40);
                    return d.toLocaleDateString("ko-KR");
                  })()}
                </span>
                {" "}(+40일)
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">비고 (선택)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {message && (
            <p className={`text-sm px-3 py-2 rounded-lg font-medium ${
              message.type === "ok"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>{message.text}</p>
          )}

          <button type="submit" disabled={saving || !qty}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {saving ? "등록 중..." : "발주 등록"}
          </button>
        </form>

        {/* 발주 목록 */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center gap-2">
            {(["ordered", "arrived"] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === s ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}>
                {s === "ordered" ? `진행 중 (${orders.filter(o => o.status === "ordered").length})` : `완료 (${orders.filter(o => o.status === "arrived").length})`}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">제품</th>
                  <th className="text-right px-4 py-3 font-medium">수량</th>
                  <th className="text-left px-4 py-3 font-medium">발주일</th>
                  <th className="text-left px-4 py-3 font-medium">입고 예정일</th>
                  {filter === "ordered" && <th className="px-4 py-3 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const days = daysUntil(o.expected_arrival);
                  const isOverdue = days < 0;
                  const isSoon = days >= 0 && days <= 7;
                  return (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {(o.product as any)?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{o.quantity.toLocaleString()}개</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{o.order_date}</td>
                      <td className="px-4 py-3">
                        {filter === "ordered" ? (
                          <div>
                            <span className={`text-xs font-semibold ${
                              isOverdue ? "text-red-600" : isSoon ? "text-amber-600" : "text-gray-700"
                            }`}>
                              {o.expected_arrival}
                            </span>
                            <span className={`ml-1.5 text-xs ${
                              isOverdue ? "text-red-400" : isSoon ? "text-amber-400" : "text-gray-400"
                            }`}>
                              {isOverdue
                                ? `(${Math.abs(days)}일 지연)`
                                : days === 0 ? "(오늘!)"
                                : `(${days}일 후)`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {o.arrived_date ?? o.expected_arrival}
                          </span>
                        )}
                      </td>
                      {filter === "ordered" && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleArrived(o.id)}
                            disabled={arrivingId === o.id}
                            className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-medium transition-colors disabled:opacity-50"
                          >
                            {arrivingId === o.id ? "처리 중..." : "입고 확인"}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={filter === "ordered" ? 5 : 4} className="text-center py-8 text-gray-400">
                      {filter === "ordered" ? "진행 중인 발주 없음" : "완료된 발주 없음"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
