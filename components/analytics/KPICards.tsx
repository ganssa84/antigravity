"use client";

type KPI = {
  total_amount: number;
  total_qty: number;
  num_partners?: number;
  num_products?: number;
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

const ALL_CARDS = [
  {
    key: "total_amount",
    label: "총 매출",
    format: (v: number) => formatKRW(v) + " 원",
    bg: "bg-indigo-50", border: "border-indigo-100", iconColor: "text-indigo-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "total_qty",
    label: "총 수량",
    format: (v: number) => formatQty(v) + " EA",
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
    format: (v: number) => v.toLocaleString() + " 개",
    bg: "bg-violet-50", border: "border-violet-100", iconColor: "text-violet-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: "num_products",
    label: "취급 제품",
    format: (v: number) => v.toLocaleString() + " 종",
    bg: "bg-amber-50", border: "border-amber-100", iconColor: "text-amber-600",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
] as const;

type CardKey = typeof ALL_CARDS[number]["key"];

export default function KPICards({
  kpi,
  visibleKeys = ["total_amount", "total_qty", "num_partners", "num_products"],
  growthRate,
}: {
  kpi: KPI | null;
  visibleKeys?: CardKey[];
  growthRate?: number | null;
}) {
  const cards = ALL_CARDS.filter((c) => visibleKeys.includes(c.key));
  return (
    <div className={`grid gap-4 ${cards.length === 1 ? "grid-cols-1 max-w-xs" : cards.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
      {cards.map((card) => {
        const value = kpi ? (kpi[card.key as keyof KPI] as number) : null;
        return (
          <div key={card.key} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border mb-3 ${card.bg} ${card.border} ${card.iconColor}`}>
              {card.icon}
            </div>
            <div className="text-xs text-gray-400 mb-1">{card.label}</div>
            <div className="text-xl font-semibold text-gray-900">
              {value == null ? "—" : card.format(value)}
            </div>
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
