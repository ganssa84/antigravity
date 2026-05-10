"use client";

import { useMemo } from "react";
import { MARKETPLACE_NAMES } from "./BRNPieChart";

type YearlyStat = { year: number; amount: number; compareAmount?: number };
type GrowthItem = { material: string; changePct: number; currentAmount: number };
type PartnerRow = { partner_name: string; amount: number };

export type InsightInputs = {
  tabType: "overview" | "team" | "marketplace";
  tabName: string;
  kpi: { total_amount: number; total_qty: number; num_partners: number; num_products: number } | null;
  yearly: YearlyStat[];
  topProducts: { material: string; amount: number }[];
  partnersAll: PartnerRow[];
  growthRate: number | null;
  topGrowing: GrowthItem[];
  topDeclining: GrowthItem[];
  brnTotals?: { brn: string; amount: number }[];
  teams?: { home_team: string; amount: number }[];
  growthTargetYear?: number;
  growthPrevYear?: number;
};

function formatKRW(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return v.toLocaleString();
}

function pct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`; }

function paretoN(partners: PartnerRow[]) {
  if (partners.length === 0) return { n: 0, sharePct: 0 };
  const total = partners.reduce((s, p) => s + p.amount, 0);
  let cum = 0, n = 0;
  for (const p of partners) { cum += p.amount; n++; if (cum / total >= 0.8) break; }
  return { n, sharePct: Math.round((n / partners.length) * 100) };
}

function generateInsights(inputs: InsightInputs) {
  const { tabType, tabName, kpi, yearly, topProducts, partnersAll, growthRate, topGrowing, topDeclining, brnTotals, teams, growthTargetYear, growthPrevYear } = inputs;

  const summary: string[] = [];
  const insights: string[] = [];
  const recommendations: string[] = [];

  // ── Revenue trend summary ──
  if (yearly.length >= 2 && kpi) {
    const last = yearly.at(-1)!;
    const prev = yearly.at(-2)!;
    const prevAmt = last.compareAmount ?? prev.amount;
    const prevYear = prev.year;
    const lastYoy = prevAmt > 0 ? (last.amount - prevAmt) / prevAmt * 100 : null;

    if (lastYoy !== null) {
      const trendWord = lastYoy >= 50 ? "급성장" : lastYoy >= 10 ? "성장" : lastYoy >= -10 ? "소폭 변동" : lastYoy >= -50 ? "감소" : "급감";
      const scopeNote = last.compareAmount != null ? `(${prevYear}년 동기 대비)` : `(전년 대비)`;
      summary.push(`${last.year}년 매출은 ${formatKRW(last.amount)}원으로 ${prevYear}년 ${scopeNote} ${pct(lastYoy)} ${trendWord}했습니다.`);
    }
  }

  if (growthRate !== null && yearly.length >= 3) {
    if (growthRate >= 30) summary.push(`연평균 ${pct(growthRate)} 고성장 중입니다.`);
    else if (growthRate >= 0) summary.push(`연평균 ${pct(growthRate)} 안정적 성장 추세입니다.`);
    else summary.push(`연평균 매출이 ${pct(growthRate)} 감소 추세를 보이고 있습니다.`);
  }

  // ── Pareto ──
  if (partnersAll.length > 0) {
    const { n, sharePct } = paretoN(partnersAll);
    const topPartner = partnersAll[0];
    const topTotal = partnersAll.reduce((s, p) => s + p.amount, 0);
    const topPct = topTotal > 0 ? (topPartner.amount / topTotal * 100).toFixed(0) : "0";

    insights.push(`상위 ${n}개 거래처(전체 ${sharePct}%)가 전체 매출의 80%를 담당합니다.`);
    insights.push(`최대 거래처 "${topPartner.partner_name.slice(0, 20)}"가 단독으로 ${topPct}% 비중입니다.`);

    if (n <= 5) {
      recommendations.push(`최상위 ${n}개 거래처 의존도가 매우 높습니다. 핵심 거래처 이탈 대비 신규 파트너 발굴을 우선 진행하세요.`);
    } else if (sharePct < 30) {
      recommendations.push(`상위 거래처 집중이 심화되어 있습니다. 거래처 다각화로 리스크를 분산하세요.`);
    }
  }

  // ── YoY growth trend ──
  if (yearly.length >= 3) {
    const rates: number[] = [];
    for (let i = 1; i < yearly.length; i++) {
      const base = yearly[i].compareAmount ?? yearly[i - 1].amount;
      if (base > 0) rates.push((yearly[i].amount - base) / base * 100);
    }
    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const recentRate = rates.at(-1);
    if (recentRate !== undefined && avgRate !== 0 && recentRate < avgRate * 0.5 && recentRate < avgRate - 20) {
      insights.push(`최근 성장률(${pct(recentRate)})이 과거 평균(${pct(avgRate)}) 대비 크게 둔화되었습니다.`);
      recommendations.push(`성장 둔화에 선제 대응하여 신규 카테고리·채널 확장 전략을 검토하세요.`);
    } else if (recentRate !== undefined && recentRate > avgRate + 30) {
      insights.push(`최근 성장이 과거 평균 대비 급가속하고 있어 지속 가능성 모니터링이 필요합니다.`);
    }
  }

  // ── Product growth/decline ──
  if (topGrowing.length > 0 && growthTargetYear && growthPrevYear) {
    const top3 = topGrowing.slice(0, 3).map(g => `${g.material.slice(0, 12)}(${pct(g.changePct)})`).join(", ");
    insights.push(`${growthPrevYear}→${growthTargetYear} 급성장 제품: ${top3}`);
    const bigWinner = topGrowing[0];
    if (bigWinner.changePct > 100) {
      recommendations.push(`"${bigWinner.material.slice(0, 15)}" 제품이 ${pct(bigWinner.changePct)} 급성장 중입니다. 재고·공급망 확대로 모멘텀을 유지하세요.`);
    }
  }
  if (topDeclining.length > 0 && growthTargetYear && growthPrevYear) {
    const top3 = topDeclining.slice(0, 3).map(g => `${g.material.slice(0, 12)}(${pct(g.changePct)})`).join(", ");
    insights.push(`${growthPrevYear}→${growthTargetYear} 매출 감소 제품: ${top3}`);
    const bigLoser = topDeclining[0];
    recommendations.push(`"${bigLoser.material.slice(0, 15)}" 등 감소 제품의 원인(가격·경쟁·수요)을 분석하고 상품 포트폴리오를 재검토하세요.`);
  }

  // ── Top product concentration ──
  if (topProducts.length > 0 && kpi && kpi.total_amount > 0) {
    const top5Amt = topProducts.slice(0, 5).reduce((s, p) => s + p.amount, 0);
    const top5Pct = (top5Amt / kpi.total_amount * 100).toFixed(0);
    if (Number(top5Pct) > 40) {
      insights.push(`Top 5 제품이 전체 매출의 ${top5Pct}%를 차지합니다.`);
      recommendations.push(`제품 집중도(Top 5 = ${top5Pct}%)가 높습니다. 중·하위 제품 육성 또는 신제품 라인업 보강을 검토하세요.`);
    }
  }

  // ── Marketplace distribution (overview only) ──
  if (tabType === "overview" && brnTotals && brnTotals.length > 0) {
    const total = brnTotals.reduce((s, b) => s + b.amount, 0);
    const top1 = brnTotals[0];
    const top1Pct = total > 0 ? (top1.amount / total * 100).toFixed(0) : "0";
    const mpName = MARKETPLACE_NAMES[top1.brn] || top1.brn;
    insights.push(`${mpName}이 전체 매출의 ${top1Pct}%로 최대 마켓플레이스입니다.`);
    if (Number(top1Pct) > 45) {
      recommendations.push(`${mpName} 채널 의존도(${top1Pct}%)가 높습니다. 타 플랫폼 입점·강화로 채널 리스크를 분산하세요.`);
    }
  }

  // ── Team distribution (overview only) ──
  if (tabType === "overview" && teams && teams.length > 0 && kpi && kpi.total_amount > 0) {
    const top1 = teams[0];
    const topPct = (top1.amount / kpi.total_amount * 100).toFixed(0);
    insights.push(`${top1.home_team} 팀이 전체 매출의 ${topPct}%로 최고 기여 팀입니다.`);
  }

  // ── Marketplace-specific insights ──
  if (tabType === "marketplace") {
    if (kpi && kpi.num_partners < 5) {
      recommendations.push(`현재 ${tabName} 채널의 거래처가 ${kpi.num_partners}개로 적습니다. 이 채널에 특화된 신규 파트너를 발굴하여 매출 기반을 넓히세요.`);
    }
  }

  // ── Fill with defaults if too few items ──
  if (recommendations.length === 0) {
    recommendations.push("현재 성장 추세를 유지하면서 신규 거래처 개발 및 제품 다각화를 지속 추진하세요.");
  }

  return { summary, insights, recommendations };
}

export default function InsightPanel(inputs: InsightInputs) {
  const { summary, insights, recommendations } = useMemo(() => generateInsights(inputs), [
    inputs.tabType, inputs.tabName, inputs.kpi, inputs.yearly, inputs.topProducts,
    inputs.partnersAll, inputs.growthRate, inputs.topGrowing, inputs.topDeclining,
    inputs.brnTotals, inputs.teams, inputs.growthTargetYear, inputs.growthPrevYear,
  ]);

  if (!inputs.kpi) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">데이터 인사이트 요약</h3>
        <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full font-medium">{inputs.tabName}</span>
      </div>

      {/* Summary */}
      {summary.length > 0 && (
        <div className="mb-4 p-3 bg-white/70 rounded-xl border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-700 mb-1.5">전체 요약</p>
          {summary.map((s, i) => (
            <p key={i} className="text-xs text-gray-700 leading-relaxed">{s}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Insights */}
        {insights.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <span className="text-amber-500">●</span> 주요 인사이트
            </p>
            <ul className="space-y-1.5">
              {insights.map((ins, i) => (
                <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
                  <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <span className="text-emerald-500">●</span> 개선 방향 및 제안
            </p>
            <ul className="space-y-1.5">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
                  <span className="text-emerald-500 shrink-0 mt-0.5">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
