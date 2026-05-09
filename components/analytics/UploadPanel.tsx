"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

type ProcessStatus = "idle" | "reading" | "processing" | "uploading" | "done" | "error";

const SHEET_NAME = "eCommerce Query";

const COL = {
  brn: 0, customer_name: 1, partner_id: 2, partner_name: 3,
  home_team: 4, commodity: 5, material_id: 6, material: 7,
  unit_cost: 8, year: 9, month: 10, qty: 11, amount: 12,
};

type Row = {
  brn: string; customer_name: string; partner_id: number; partner_name: string;
  home_team: string; commodity: number; material_id: string; material: string;
  unit_cost: number; year: number; month: number; qty: number; amount: number;
};

function processRows(rows: unknown[][]): ReturnType<typeof buildPayload> {
  const data: Row[] = [];
  for (const raw of rows) {
    const year = Number(raw[COL.year]);
    const month = Number(raw[COL.month]);
    const amount = Number(raw[COL.amount]);
    if (!year || !month || isNaN(amount)) continue;
    data.push({
      brn: String(raw[COL.brn] ?? ""),
      customer_name: String(raw[COL.customer_name] ?? ""),
      partner_id: Number(raw[COL.partner_id]),
      partner_name: String(raw[COL.partner_name] ?? ""),
      home_team: String(raw[COL.home_team] ?? ""),
      commodity: Number(raw[COL.commodity] ?? 0),
      material_id: String(raw[COL.material_id] ?? ""),
      material: String(raw[COL.material] ?? ""),
      unit_cost: Number(raw[COL.unit_cost] ?? 0),
      year,
      month,
      qty: Number(raw[COL.qty] ?? 0),
      amount: isNaN(amount) ? 0 : amount,
    });
  }
  return buildPayload(data);
}

function agg<K extends string>(
  data: Row[],
  keyFn: (r: Row) => string,
  fields: K[],
  valueFn: (r: Row) => Record<K, number | string>
): Record<string, Record<K, number | string>> {
  const map: Record<string, Record<K, number | string>> = {};
  for (const r of data) {
    const k = keyFn(r);
    if (!map[k]) map[k] = valueFn(r);
    else {
      for (const f of fields) {
        if (typeof map[k][f] === "number") {
          (map[k][f] as number) += valueFn(r)[f] as number;
        }
      }
    }
  }
  return map;
}

function buildPayload(data: Row[]) {
  const teams = [...new Set(data.map((r) => r.home_team).filter(Boolean))].sort();
  const years = [...new Set(data.map((r) => r.year))].sort((a, b) => a - b);
  const brns = [...new Set(data.map((r) => r.brn))].sort();

  function makeStat(rows: Row[]) {
    return {
      total_amount: Math.round(rows.reduce((s, r) => s + r.amount, 0)),
      total_qty: Math.round(rows.reduce((s, r) => s + r.qty, 0) * 100) / 100,
      num_partners: new Set(rows.map((r) => r.partner_name)).size,
      num_products: new Set(rows.map((r) => r.material)).size,
      num_customers: new Set(rows.map((r) => r.customer_name)).size,
    };
  }

  const summary = {
    overall: makeStat(data),
    by_team: Object.fromEntries(teams.map((t) => [t, makeStat(data.filter((r) => r.home_team === t))])),
    by_year: Object.fromEntries(years.map((y) => [String(y), makeStat(data.filter((r) => r.year === y))])),
    teams,
    years,
    brns,
  };

  // monthly: year × month × home_team
  const monthlyMap: Record<string, { year: number; month: number; home_team: string; amount: number; qty: number }> = {};
  for (const r of data) {
    const k = `${r.year}-${r.month}-${r.home_team}`;
    if (!monthlyMap[k]) monthlyMap[k] = { year: r.year, month: r.month, home_team: r.home_team, amount: 0, qty: 0 };
    monthlyMap[k].amount += r.amount;
    monthlyMap[k].qty += r.qty;
  }
  const monthly = Object.values(monthlyMap)
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map((r) => ({ ...r, amount: Math.round(r.amount), qty: Math.round(r.qty * 100) / 100 }));

  // products: material × material_id × home_team × year
  const productMap: Record<string, { material: string; material_id: string; home_team: string; year: number; amount: number; qty: number }> = {};
  for (const r of data) {
    const k = `${r.material_id}|${r.home_team}|${r.year}`;
    if (!productMap[k]) productMap[k] = { material: r.material, material_id: r.material_id, home_team: r.home_team, year: r.year, amount: 0, qty: 0 };
    productMap[k].amount += r.amount;
    productMap[k].qty += r.qty;
  }
  const products = Object.values(productMap).map((r) => ({ ...r, amount: Math.round(r.amount) }));

  // partners: partner_name × home_team × year
  const partnerMap: Record<string, { partner_name: string; home_team: string; year: number; amount: number; qty: number; num_products: number }> = {};
  for (const r of data) {
    const k = `${r.partner_name}|${r.home_team}|${r.year}`;
    if (!partnerMap[k]) partnerMap[k] = { partner_name: r.partner_name, home_team: r.home_team, year: r.year, amount: 0, qty: 0, num_products: 0 };
    partnerMap[k].amount += r.amount;
    partnerMap[k].qty += r.qty;
  }
  const partnerProdCount: Record<string, Set<string>> = {};
  for (const r of data) {
    const k = `${r.partner_name}|${r.home_team}|${r.year}`;
    if (!partnerProdCount[k]) partnerProdCount[k] = new Set();
    partnerProdCount[k].add(r.material_id);
  }
  const partners = Object.entries(partnerMap).map(([k, v]) => ({
    ...v, amount: Math.round(v.amount), qty: Math.round(v.qty * 100) / 100,
    num_products: partnerProdCount[k]?.size ?? 0,
  }));

  // brn: brn × home_team × year × month
  const brnMap: Record<string, { brn: string; home_team: string; year: number; month: number; amount: number; qty: number }> = {};
  for (const r of data) {
    const k = `${r.brn}|${r.home_team}|${r.year}|${r.month}`;
    if (!brnMap[k]) brnMap[k] = { brn: r.brn, home_team: r.home_team, year: r.year, month: r.month, amount: 0, qty: 0 };
    brnMap[k].amount += r.amount;
    brnMap[k].qty += r.qty;
  }
  const brn = Object.values(brnMap).map((r) => ({ ...r, amount: Math.round(r.amount) }));

  // commodity: commodity × home_team × year
  const commodityMap: Record<string, { commodity: number; home_team: string; year: number; amount: number; qty: number; products: Set<string> }> = {};
  for (const r of data) {
    const k = `${r.commodity}|${r.home_team}|${r.year}`;
    if (!commodityMap[k]) commodityMap[k] = { commodity: r.commodity, home_team: r.home_team, year: r.year, amount: 0, qty: 0, products: new Set() };
    commodityMap[k].amount += r.amount;
    commodityMap[k].qty += r.qty;
    commodityMap[k].products.add(r.material_id);
  }
  const commodity = Object.values(commodityMap).map(({ products, ...r }) => ({
    ...r, amount: Math.round(r.amount), num_products: products.size,
  }));

  return { summary, monthly, products, partners, brn, commodity };
}

const STATUS_LABELS: Record<ProcessStatus, string> = {
  idle: "",
  reading: "파일 읽는 중...",
  processing: "데이터 집계 중...",
  uploading: "처리 중...",
  done: "완료!",
  error: "",
};

export type ProcessedData = ReturnType<typeof buildPayload>;

export default function UploadPanel({ onData }: { onData: (data: ProcessedData) => void }) {
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Excel 파일(.xlsx, .xls)만 업로드 가능합니다.");
      setStatus("error");
      return;
    }

    setError("");
    setStatus("reading");
    setProgress(`파일 크기: ${(file.size / 1024 / 1024).toFixed(1)} MB`);

    try {
      const buffer = await file.arrayBuffer();
      setStatus("processing");
      setProgress("eCommerce Query 시트 파싱 중...");

      const wb = XLSX.read(buffer, { type: "array" });

      const sheetName = wb.SheetNames.find(
        (n) => n.trim().toLowerCase() === SHEET_NAME.toLowerCase()
      );
      if (!sheetName) {
        throw new Error(
          `"${SHEET_NAME}" 시트를 찾을 수 없습니다.\n현재 시트: ${wb.SheetNames.join(", ")}`
        );
      }

      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

      const dataRows = rows.slice(1).filter((r) => (r as unknown[]).some((v) => v !== null));
      setProgress(`총 ${dataRows.length.toLocaleString()}행 처리 중...`);

      const payload = processRows(dataRows as unknown[][]);
      setProgress(`집계 완료. 서버에 저장 중...`);

      setStatus("done");
      setProgress("");
      onData(payload);
      setTimeout(() => setStatus("idle"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
      setStatus("error");
    }
  }, [onData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isProcessing = ["reading", "processing", "uploading"].includes(status);

  return (
    <div className="rounded-2xl bg-white/3 border border-white/8 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-300">데이터 업데이트</h3>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${dragOver ? "border-blue-500/60 bg-blue-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/3"}
          ${isProcessing ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-400">{STATUS_LABELS[status]}</p>
            {progress && <p className="text-xs text-gray-600">{progress}</p>}
          </div>
        ) : status === "done" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-emerald-400 font-medium">업데이트 완료!</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="text-sm text-gray-400">
                <span className="text-blue-400">클릭</span>하거나 파일을 여기에 드래그하세요
              </p>
              <p className="text-xs text-gray-600 mt-1">Query.xlsx → eCommerce Query 시트 자동 인식</p>
            </div>
          </div>
        )}
      </div>

      {status === "error" && error && (
        <div className="mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 whitespace-pre-line">{error}</p>
        </div>
      )}
    </div>
  );
}
