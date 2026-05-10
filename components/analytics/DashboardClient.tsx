"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import KPICards from "./KPICards";
import MonthlySalesChart from "./MonthlySalesChart";
import YearlyBarChart from "./YearlyBarChart";
import YTDChart from "./YTDChart";
import TopProductsChart from "./TopProductsChart";
import TeamDonutChart from "./TeamDonutChart";
import PartnerBarChart from "./PartnerBarChart";
import BRNPieChart from "./BRNPieChart";
import CommodityCompareChart from "./CommodityCompareChart";
import ProductTabView from "./ProductTabView";
import UploadPanel, { type ProcessedData } from "./UploadPanel";

const TEAMS = ["AAD", "ASD", "ISD", "EMD", "PSD", "IATD"] as const;

const TEAM_COLORS: Record<string, string> = {
  AAD: "#fb923c", ASD: "#f87171", ISD: "#a78bfa",
  EMD: "#10b981", PSD: "#6366f1", IATD: "#f59e0b",
};

export default function DashboardClient({ initialTab = "overview" }: { initialTab?: string }) {
  const router = useRouter();
  const [rawData, setRawData] = useState<ProcessedData | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [showUpload, setShowUpload] = useState(false);

  const allYears = rawData?.summary.years ?? [];

  // "products" tab also uses ALL teams
  const selectedTeam = (activeTab === "overview" || activeTab === "products") ? "ALL" : activeTab;

  const chartData = useMemo(() => {
    if (!rawData) return null;

    const byTeam = <T extends { home_team: string }>(d: T[]) =>
      selectedTeam === "ALL" ? d : d.filter((r) => r.home_team === selectedTeam);
    const byYear = <T extends { year: number }>(d: T[]) =>
      selectedYear === "ALL" ? d : d.filter((r) => r.year === parseInt(selectedYear));
    const filter = <T extends { home_team: string; year: number }>(d: T[]) =>
      byYear(byTeam(d));

    const monthlyFiltered = filter(rawData.monthly);
    const monthlyByYear: Record<number, { month: number; amount: number; qty: number }[]> = {};
    for (const r of monthlyFiltered) {
      if (!monthlyByYear[r.year]) monthlyByYear[r.year] = [];
      const ex = monthlyByYear[r.year].find((d) => d.month === r.month);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else monthlyByYear[r.year].push({ month: r.month, amount: r.amount, qty: r.qty });
    }

    const yearlyMap = new Map<number, number>();
    for (const r of monthlyFiltered) yearlyMap.set(r.year, (yearlyMap.get(r.year) ?? 0) + r.amount);
    const yearly = Array.from(yearlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, amount]) => ({ year, amount, qty: 0 }));

    const productMap = new Map<string, { material: string; material_id: string; amount: number; qty: number }>();
    for (const r of filter(rawData.products)) {
      const ex = productMap.get(r.material_id);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else productMap.set(r.material_id, { material: r.material, material_id: r.material_id, amount: r.amount, qty: r.qty });
    }
    const products = Array.from(productMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 15);

    const partnerMap = new Map<string, { partner_name: string; amount: number; qty: number; num_products: number }>();
    for (const r of filter(rawData.partners)) {
      const ex = partnerMap.get(r.partner_name);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else partnerMap.set(r.partner_name, { partner_name: r.partner_name, amount: r.amount, qty: r.qty, num_products: r.num_products });
    }
    const partners = Array.from(partnerMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 15);

    const teamMap = new Map<string, { home_team: string; amount: number; qty: number }>();
    for (const r of byYear(rawData.monthly)) {
      const ex = teamMap.get(r.home_team);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else teamMap.set(r.home_team, { home_team: r.home_team, amount: r.amount, qty: r.qty });
    }
    const teams = Array.from(teamMap.values()).sort((a, b) => b.amount - a.amount);

    const brnMap = new Map<string, { brn: string; amount: number; qty: number }>();
    for (const r of filter(rawData.brn)) {
      const ex = brnMap.get(r.brn);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else brnMap.set(r.brn, { brn: r.brn, amount: r.amount, qty: r.qty });
    }
    const brnTotals = Array.from(brnMap.values()).sort((a, b) => b.amount - a.amount);

    const totalAmount = monthlyFiltered.reduce((s, r) => s + r.amount, 0);
    const totalQty = monthlyFiltered.reduce((s, r) => s + r.qty, 0);
    const kpi = {
      total_amount: Math.round(totalAmount),
      total_qty: Math.round(totalQty * 100) / 100,
      num_partners: partnerMap.size || rawData.summary.overall.num_partners,
      num_products: productMap.size || rawData.summary.overall.num_products,
    };

    // Commodity YoY comparison
    const currentYr = selectedYear === "ALL"
      ? Math.max(...rawData.summary.years)
      : parseInt(selectedYear);
    const prevYr = currentYr - 1;

    const cMap = new Map<number, { current: number; prev: number }>();
    for (const r of byTeam(rawData.commodity)) {
      if (r.year !== currentYr && r.year !== prevYr) continue;
      if (!cMap.has(r.commodity)) cMap.set(r.commodity, { current: 0, prev: 0 });
      const entry = cMap.get(r.commodity)!;
      if (r.year === currentYr) entry.current += r.amount;
      else entry.prev += r.amount;
    }
    const commodityCompare = Array.from(cMap.entries())
      .map(([commodity, d]) => ({
        commodity,
        currentAmount: Math.round(d.current),
        prevAmount: Math.round(d.prev),
        change: d.prev > 0 ? ((d.current - d.prev) / d.prev) * 100 : null,
      }))
      .sort((a, b) => b.currentAmount - a.currentAmount);

    return { monthlyByYear, yearly, products, partners, teams, brnTotals, kpi, commodityCompare, currentYr, prevYr };
  }, [rawData, selectedTeam, selectedYear]);

  async function handleLogout() {
    await fetch("/api/analytics/auth", { method: "DELETE" });
    router.push("/analytics/login");
  }

  const isOverview = activeTab === "overview";
  const isProducts = activeTab === "products";
  const isTeam = !isOverview && !isProducts;

  const pageTitle = isOverview ? "Overview" : isProducts ? "취급제품" : activeTab;
  const pageSubtitle = isOverview ? "전체 현황" : isProducts ? "제품 현황 및 트렌드" : `${activeTab} Home Team`;

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen shrink-0 z-10">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">eCommerce</p>
              <p className="text-xs text-gray-400">Analytics</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {/* Overview */}
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isOverview ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Overview
          </button>

          {/* 취급제품 */}
          <button
            onClick={() => setActiveTab("products")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isProducts ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            취급제품
          </button>

          <div className="pt-4 pb-1.5 px-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Home Teams</p>
          </div>

          {TEAMS.map((team) => (
            <button
              key={team}
              onClick={() => setActiveTab(team)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === team ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TEAM_COLORS[team] }} />
              {team}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-gray-100 space-y-0.5">
          {rawData && (
            <button
              onClick={() => setShowUpload((v) => !v)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showUpload ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              파일 교체
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {!rawData ? (
          <div className="flex flex-col items-center justify-center min-h-screen px-8">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center mb-4">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-6">Excel 파일을 올리면 대시보드가 표시됩니다.</p>
            <div className="w-full max-w-lg">
              <UploadPanel onData={(data) => { setRawData(data); setShowUpload(false); }} />
            </div>
          </div>
        ) : (
          <>
            {showUpload && (
              <div className="px-8 pt-6">
                <UploadPanel onData={(data) => { setRawData(data); setShowUpload(false); }} />
              </div>
            )}

            {/* Page header */}
            <div className="px-8 pt-6 pb-2 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {pageSubtitle}{selectedYear !== "ALL" && ` · ${selectedYear}년`}
                </p>
              </div>
              {/* Year filter */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setSelectedYear("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedYear === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  전체
                </button>
                {allYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(String(y))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedYear === String(y) ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* 취급제품 tab */}
            {isProducts && (
              <div className="px-8 pb-10 pt-4">
                <ProductTabView
                  products={rawData.products}
                  years={rawData.summary.years}
                  selectedYear={selectedYear}
                />
              </div>
            )}

            {/* Overview & Team tabs */}
            {!isProducts && chartData && (
              <div className="px-8 pb-10 pt-4 space-y-5">
                {/* KPI: overview shows 총매출 only; team shows all 4 */}
                <KPICards
                  kpi={chartData.kpi}
                  visibleKeys={isOverview ? ["total_amount"] : ["total_amount", "total_qty", "num_partners", "num_products"]}
                />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  <div className="xl:col-span-2">
                    <MonthlySalesChart byYear={chartData.monthlyByYear} />
                  </div>
                  <YearlyBarChart data={chartData.yearly} />
                </div>

                {/* YTD period comparison */}
                <YTDChart byYear={chartData.monthlyByYear} />

                {isOverview ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <TeamDonutChart data={chartData.teams} />
                      <BRNPieChart data={chartData.brnTotals} />
                    </div>
                    <TopProductsChart data={chartData.products} />
                    <PartnerBarChart data={chartData.partners} />
                  </>
                ) : (
                  <>
                    <CommodityCompareChart
                      data={chartData.commodityCompare}
                      currentYear={chartData.currentYr}
                      prevYear={chartData.prevYr}
                    />
                    <TopProductsChart data={chartData.products} />
                    <PartnerBarChart data={chartData.partners} />
                    <BRNPieChart data={chartData.brnTotals} />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
