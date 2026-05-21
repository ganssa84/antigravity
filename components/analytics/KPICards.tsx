"use client";

import type { ReactElement } from "react";

type KPI = {
  total_amount: number;
  total_qty: number;
  num_partners?: number;
  num_products?: number;
  prev_amount?: number;
  yoy_rate?: number;
  cagr?: number;
  q1_current?: number;
  q1_prev?: number;
};

type CardKey = "total_amount" | "total_qty" | "num_partners" | "num_products" | "prev_amount" | "yoy_rate" | "cagr" | "q1_current" | "q1_prev";

type CardConfig = {
  key: CardKey;
  label: string;
  format: (v: number) => string;
  bg: string;
  border: string;
  iconColor: string;
  isPercent?: boolean;
  icon: ReactElement;
};

function formatKRW(value: number) {
  if (Math.abs(value) >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}조`;
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만`;
  return value.toLocaleString();
}

function formatQty(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

const ALL_CARDS: CardConfig[] = [
  {
    key: "total_amount",
    label: "총 매출",
    format: (v) => formatKRW(v) + " 원",
    bg: "bg-indigo-50", border: "border-indigo-100", iconColor: "text-indigo-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "prev_amount",
    label: "전년 동기 매출",
    format: (v) => formatKRW(v) + " 원",
    bg: "bg-sky-50", border: "border-sky-100", iconColor: "text-sky-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "yoy_rate",
    label: "YoY 성장률",
    format: (v) => `${Math.abs(v).toFixed(1)}%`,
    bg: "bg-teal-50", border: "border-teal-100", iconColor: "text-teal-600",
    isPercent: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    key: "q1_current",
    label: "올해 YTD 매출",
    format: (v) => formatKRW(v) + " 원",
    bg: "bg-indigo-50", border: "border-indigo-100", iconColor: "text-indigo-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "q1_prev",
    label: "전년 동기 매출",
    format: (v) => formatKRW(v) + " 원",
    bg: "bg-sky-50", border: "border-sky-100", iconColor: "text-sky-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "cagr",
    label: "CAGR (2023~2025)",
    format: (v) => `${Math.abs(v).toFixed(1)}%`,
    bg: "bg-violet-50", border: "border-violet-100", iconColor: "text-violet-600",
    isPercent: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: "total_qty",
    label: "총 수량",
    format: (v) => formatQty(v) + " EA",
    bg: "bg-emerald-50", border: "border-emerald-100", iconColor: "text-emerald-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: "num_partners",
    label: "거래 업체",
    format: (v) => v.toLocaleString() + " 개",
    bg: "bg-amber-50", border: "border-amber-100", iconColor: "text-amber-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: "num_products",
    label: "취급 제품",
    format: (v) => v.toLocaleString() + " 종",
    bg: "bg-rose-50", border: "border-rose-100", iconColor: "text-rose-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

export default function KPICards({
  kpi,
  visibleKeys = ["total_amount", "total_qty", "num_partners", "num_products"],
  growthRate,
  ytdMaxMonth,
  ytdTargetYear,
}: {
  kpi: KPI | null;
  visibleKeys?: CardKey[];
  growthRate?: number | null;
  ytdMaxMonth?: number;
  ytdTargetYear?: number;
}) {
  const cards = ALL_CARDS.filter((c) => visibleKeys.includes(c.key)).map((c) => {
    if (c.key === "q1_current" && ytdMaxMonth && ytdTargetYear)
      return { ...c, label: `${ytdTargetYear}년 1~${ytdMaxMonth}월 매출` };
    if (c.key === "q1_prev" && ytdMaxMonth && ytdTargetYear)
      return { ...c, label: `${ytdTargetYear - 1}년 1~${ytdMaxMonth}월 매출` };
    return c;
  });
  return (
    <div className={`grid gap-4 ${cards.length === 1 ? "grid-cols-1 max-w-xs" : cards.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
      {cards.map((card) => {
        const value = kpi ? (kpi[card.key as keyof KPI] as number | undefined) ?? null : null;
        return (
          <div key={card.key} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border mb-3 ${card.bg} ${card.border} ${card.iconColor}`}>
              {card.icon}
            </div>
            <div className="text-xs text-gray-400 mb-1">{card.label}</div>
            {card.isPercent ? (
              <div className={`text-xl font-bold ${value == null ? "text-gray-400" : value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {value == null ? "—" : `${value >= 0 ? "▲" : "▼"} ${card.format(value)}`}
              </div>
            ) : (
              <div className="text-xl font-semibold text-gray-900">
                {value == null ? "—" : card.format(value)}
              </div>
            )}
            {card.key === "total_amount" && growthRate != null && (
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${growthRate >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                <span>{growthRate >= 0 ? "▲" : "▼"} {Math.abs(growthRate).toFixed(1)}%</span>
                <span className="font-normal text-gray-400">평균 성장률</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
