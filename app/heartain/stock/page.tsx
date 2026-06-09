"use client";

import { useEffect, useState } from "react";
import {
  getProducts, getStockIns, addStockIn,
  getNaverMappings, upsertNaverMapping,
  type Product, type StockInRecord, type NaverMapping,
} from "@/lib/heartain-db";

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockIns, setStockIns] = useState<StockInRecord[]>([]);
  const [mappings, setMappings] = useState<NaverMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"stock" | "naver">("stock");

  const [productId, setProductId] = useState<number>(0);
  const [qty, setQty] = useState("");
  const [stockDate, setStockDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [mapProductId, setMapProductId] = useState<number>(0);
  const [naverName, setNaverName] = useState("");
  const [naverOption, setNaverOption] = useState("");
  const [mapSaving, setMapSaving] = useState(false);
  const [mapMessage, setMapMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([getProducts(), getStockIns(), getNaverMappings()])
      .then(([p, s, m]) => {
        setProducts(p);
        setStockIns(s);
        setMappings(m);
        if (p.length > 0) { setProductId(p[0].id); setMapProductId(p[0].id); }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !qty) return;
    setSaving(true);
    setMessage(null);
    try {
      await addStockIn(productId, parseInt(qty, 10), stockDate, note || undefined);
      const s = await getStockIns();
      setStockIns(s);
      setQty("");
      setNote("");
      setMessage({ type: "ok", text: "입고 기록 완료" });
    } catch (e: any) {
      setMessage({ type: "err", text: e.message ?? "저장 실패" });
    } finally {
      setSaving(false);
    }
  };

  const handleMapSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapProductId || !naverName) return;
    setMapSaving(true);
    setMapMessage(null);
    try {
      await upsertNaverMapping(mapProductId, naverName, naverOption || undefined);
      const m = await getNaverMappings();
      setMappings(m);
      setNaverName("");
      setNaverOption("");
      setMapMessage({ type: "ok", text: "매핑 저장 완료" });
    } catch (e: any) {
      setMapMessage({ type: "err", text: e.message ?? "저장 실패" });
    } finally {
      setMapSaving(false);
    }
  };

  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? "-";

  if (loading) return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">입고 관리</h1>
        <div className="flex gap-1">
          {(["stock", "naver"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {t === "stock" ? "입고 기록" : "네이버 매핑"}
            </button>
          ))}
        </div>
      </div>

      {tab === "stock" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form onSubmit={handleStockIn} className="lg:col-span-2 space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">제품</label>
              <select
                value={productId}
                onChange={(e) => setProductId(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">입고 수량</label>
              <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="수량"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">입고 날짜</label>
              <input type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">비고 (선택)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {message && (
              <p className={`text-sm px-3 py-2 rounded-lg font-medium ${
                message.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}>{message.text}</p>
            )}
            <button type="submit" disabled={saving || !qty}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">
              {saving ? "저장 중..." : "입고 기록"}
            </button>
          </form>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">입고 내역</h2>
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
                  {stockIns.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400">{s.stock_date}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{(s.product as any)?.name ?? "-"}</td>
                      <td className="px-4 py-2.5 text-right text-green-600 font-medium">+{s.quantity}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{s.note ?? "-"}</td>
                    </tr>
                  ))}
                  {stockIns.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">입고 내역 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "naver" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form onSubmit={handleMapSave} className="lg:col-span-2 space-y-4">
            <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              네이버 주문 자동 동기화 시, 어떤 제품인지 인식하기 위한 매핑입니다. 스마트스토어의 실제 상품명과 옵션명을 입력하세요.
            </p>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">heartain 제품</label>
              <select value={mapProductId} onChange={(e) => setMapProductId(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">네이버 상품명</label>
              <input type="text" value={naverName} onChange={(e) => setNaverName(e.target.value)} placeholder="예: 하틴 메시지 크로셰 인형"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">옵션명 (선택)</label>
              <input type="text" value={naverOption} onChange={(e) => setNaverOption(e.target.value)} placeholder="예: 거북이"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">한 상품에 캐릭터 옵션이 있으면 옵션명으로 구분</p>
            </div>
            {mapMessage && (
              <p className={`text-sm px-3 py-2 rounded-lg font-medium ${
                mapMessage.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}>{mapMessage.text}</p>
            )}
            <button type="submit" disabled={mapSaving || !naverName}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">
              {mapSaving ? "저장 중..." : "매핑 저장"}
            </button>
          </form>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">현재 매핑 ({mappings.length}개)</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left px-4 py-3 font-medium">heartain 제품</th>
                    <th className="text-left px-4 py-3 font-medium">네이버 상품명</th>
                    <th className="text-left px-4 py-3 font-medium">옵션명</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{productName(m.product_id)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{m.naver_product_name}</td>
                      <td className="px-4 py-2.5 text-gray-400">{m.naver_option_name ?? "-"}</td>
                    </tr>
                  ))}
                  {mappings.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-gray-400">매핑 없음</td></tr>
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
