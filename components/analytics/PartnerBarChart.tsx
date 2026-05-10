"use client";

import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MARKETPLACE_NAMES } from "./BRNPieChart";

type PartnerBrnRow = {
  partner_name: string; brn: string; home_team: string; year: number; amount: number; qty: number;
};
type PartnerProductRow = {
  partner_name: string; material: string; material_id: string; brn: string; home_team: string; year: number; amount: number; qty: number;
};

const TEAM_COLORS: Record<string, string> = {
  AAD: "#fb923c", ASD: "#f87171", ISD: "#a78bfa",
  EMD: "#10b981", PSD: "#6366f1", IATD: "#f59e0b",
};

const BAR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f87171", "#a78bfa", "#fb923c", "#34d399", "#60a5fa", "#c084fc"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조원`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`;
  return `${(v / 10_000).toFixed(0)}만원`;
}

function formatAmountShort(v: number) {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억`;
  return `${(v / 10_000).toFixed(0)}만`;
}

export default function PartnerBarChart({
  partnerBrn,
  partnerProducts,
}: {
  partnerBrn: PartnerBrnRow[];
  partnerProducts: PartnerProductRow[];
}) {
  const [selectedBrn, setSelectedBrn] = useState<string>("ALL");
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [detailTeam, setDetailTeam] = useState<string>("ALL");

  const availableBrns = useMemo(() => {
    return [...new Set(partnerBrn.map(r => r.brn))].sort();
  }, [partnerBrn]);

  const top20 = useMemo(() => {
    const filtered = selectedBrn === "ALL" ? partnerBrn : partnerBrn.filter(r => r.brn === selectedBrn);
    const map = new Map<string, number>();
    for (const r of filtered) map.set(r.partner_name, (map.get(r.partner_name) ?? 0) + r.amount);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([partner_name, amount]) => ({ partner_name, amount }));
  }, [partnerBrn, selectedBrn]);

  const expandedProducts = useMemo(() => {
    if (!expandedPartner) return [];
    const filtered = partnerProducts.filter(r => {
      if (r.partner_name !== expandedPartner) return false;
      if (selectedBrn !== "ALL" && r.brn !== selectedBrn) return false;
      if (detailTeam !== "ALL" && r.home_team !== detailTeam) return false;
      return true;
    });
    const map = new Map<string, { material: string; amount: number }>();
    for (const r of filtered) {
      const ex = map.get(r.material_id);
      if (ex) ex.amount += r.amount;
      else map.set(r.material_id, { material: r.material, amount: r.amount });
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 20);
  }, [partnerProducts, expandedPartner, selectedBrn, detailTeam]);

  const expandedTeams = useMemo(() => {
    if (!expandedPartner) return [];
    return [...new Set(partnerProducts.filter(r => r.partner_name === expandedPartner).map(r => r.home_team))].sort();
  }, [partnerProducts, expandedPartner]);

  const handlePartnerClick = useCallback((name: string) => {
    setExpandedPartner(prev => prev === name ? null : name);
    setDetailTeam("ALL");
  }, []);

  const chartData = top20.map(p => ({ name: p.partner_name, amount: p.amount }));
  const chartHeight = Math.max(300, chartData.length * 28 + 60);

  const customTick = useCallback((props: Record<string, unknown>) => {
    const x = props.x as number;
    const y = props.y as number;
    const value = (props.payload as { value: string }).value;
    const isSelected = value === expandedPartner;
    const display = value.length > 16 ? value.slice(0, 16) + "…" : value;
    return (
      <g transform={`translate(${x},${y})`} style={{ cursor: "pointer" }} onClick={() => handlePartnerClick(value)}>
        <text x={0} y={0} dy={4} textAnchor="end" fill={isSelected ? "#6366f1" : "#6b7280"} fontSize={11} fontWeight={isSelected ? 600 : 400}>
          {display}
        </text>
      </g>
    );
  }, [expandedPartner, handlePartnerClick]);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-700">대리점별 매출 Top 20</h3>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setSelectedBrn("ALL"); setExpandedPartner(null); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedBrn === "ALL" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            전체
          </button>
          {availableBrns.map(brn => (
            <button
              key={brn}
              onClick={() => { setSelectedBrn(brn); setExpandedPartner(null); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedBrn === brn ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {MARKETPLACE_NAMES[brn] || brn}
            </button>
          ))}
        </div>
      </div>

      <p className="inline-flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full mb-3 font-medium">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
        업체명 또는 바 클릭 시 제품 상세 보기
      </p>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatAmountShort}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            axisLine={false}
            tickLine={false}
            tick={customTick as never}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(v) => [`${(v as number).toLocaleString()} 원`, "매출"]}
          />
          <Bar
            dataKey="amount"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(d: { name?: string }) => handlePartnerClick(d.name ?? "")}
          >
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.name === expandedPartner ? "#4f46e5" : BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {expandedPartner && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-semibold text-gray-800">
              {expandedPartner}
              {selectedBrn !== "ALL" && (
                <span className="ml-2 text-xs text-gray-400 font-normal">· {MARKETPLACE_NAMES[selectedBrn] || selectedBrn}</span>
              )}
            </h4>
            {expandedTeams.length > 1 && (
              <div className="flex gap-1">
                <button
                  onClick={() => setDetailTeam("ALL")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    detailTeam === "ALL" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  전체
                </button>
                {expandedTeams.map(t => (
                  <button
                    key={t}
                    onClick={() => setDetailTeam(t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      detailTeam === t ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    style={detailTeam === t ? { backgroundColor: TEAM_COLORS[t] || "#6366f1" } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {expandedProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {expandedProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{p.material}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 shrink-0">{formatAmount(p.amount)}</span>
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${(p.amount / expandedProducts[0].amount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
