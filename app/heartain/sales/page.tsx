"use client";

import { useEffect, useState } from "react";
import { getProducts, getSales, addSale, type Product, type SaleRecord } from "@/lib/heartain-db";

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([getProducts(), getSales()])
      .then(([p, s]) => { setProducts(p); setSales(s); })
      .finally(() => setLoading(false));
  }, []);

  const setEntry = (id: number, val: string) => {
    const n = parseInt(val, 10);
    setEntries((prev) => {
      const next = { ...prev };
      if (!val || isNaN(n) || n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = Object.entries(entries).filter(([, q]) => q > 0);
    if (items.length === 0) return;

    setSaving(true);
    setMessage(null);
    try {
      await Promise.all(items.map(([id, qty]) => addSale(Number(id), qty, date)));
      const s = await getSales();
      setSales(s);
      setEntries({});
      setMessage({ type: "ok", text: `${items.length}개 제품 판매 기록 완료` });
    } catch (e: any) {
      setMessage({ type: "err", text: e.message ?? "저장 실패" });
    } finally {
      setSaving(false);
    }
  };

  const totalItems = Object.values(entries).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">판매 입력</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1 font-medium">판매 날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-2 text-xs text-gray-500 font-medium border-b border-gray-100 bg-gray-50 sticky top-0">
                제품별 판매 수량
              </div>
              <div className="max-h-[460px] overflow-y-auto">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50">
                    <span className="flex-1 text-sm text-gray-800">{p.name}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={entries[p.id] ?? ""}
                      onChange={(e) => setEntry(p.id, e.target.value)}
                      className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {message && (
              <p className={`text-sm px-3 py-2 rounded-lg font-medium ${
                message.type === "ok"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || totalItems === 0}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              {saving ? "저장 중..." : `저장 (${totalItems}개)`}
            </button>
          </form>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">최근 판매 내역</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left px-4 py-3 font-medium">날짜</th>
                    <th className="text-left px-4 py-3 font-medium">제품</th>
                    <th className="text-right px-4 py-3 font-medium">수량</th>
                    <th className="text-left px-4 py-3 font-medium">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 50).map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400">{s.sale_date}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{(s.product as any)?.name ?? "-"}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{s.quantity}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs truncate max-w-[120px]">
                        {s.naver_order_id ? "🛒 네이버" : s.note ?? "-"}
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-400">판매 내역 없음</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
