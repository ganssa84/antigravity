"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import KPICards from "./KPICards";
import MonthlySalesChart from "./MonthlySalesChart";
import YearlyBarChart from "./YearlyBarChart";
import TopProductsChart from "./TopProductsChart";
import TeamDonutChart from "./TeamDonutChart";
import PartnerBarChart from "./PartnerBarChart";
import BRNPieChart from "./BRNPieChart";
import FilterBar from "./FilterBar";
import UploadPanel, { type ProcessedData } from "./UploadPanel";

const TEAM_LABELS: Record<string, string> = {
  ALL: "전체", AAD: "AAD", ASD: "ASD", CMSD: "CMSD", EMD: "EMD", PSD: "PSD", IATD: "IATD",
};

export default function DashboardClient({
  initialTeam = "ALL",
  initialYear = "ALL",
}: {
  initialTeam?: string;
  initialYear?: string;
}) {
  const router = useRouter();
  const [rawData, setRawData] = useState<ProcessedData | null>(null);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [showUpload, setShowUpload] = useState(false);

  const allTeams = rawData?.summary.teams ?? [];
  const allYears = rawData?.summary.years ?? [];

  // All filtering & aggregation happens in the browser — no API calls
  const chartData = useMemo(() => {
    if (!rawData) return null;

    const byTeam = <T extends { home_team: string }>(d: T[]) =>
      selectedTeam === "ALL" ? d : d.filter((r) => r.home_team === selectedTeam);
    const byYear = <T extends { year: number }>(d: T[]) =>
      selectedYear === "ALL" ? d : d.filter((r) => r.year === parseInt(selectedYear));
    const filter = <T extends { home_team: string; year: number }>(d: T[]) =>
      byYear(byTeam(d));

    // Monthly by-year map for line chart
    const monthlyFiltered = filter(rawData.monthly);
    const monthlyByYear: Record<number, { month: number; amount: number; qty: number }[]> = {};
    for (const r of monthlyFiltered) {
      if (!monthlyByYear[r.year]) monthlyByYear[r.year] = [];
      const ex = monthlyByYear[r.year].find((d) => d.month === r.month);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else monthlyByYear[r.year].push({ month: r.month, amount: r.amount, qty: r.qty });
    }

    // Yearly totals for bar chart
    const yearlyMap = new Map<number, number>();
    for (const r of monthlyFiltered) yearlyMap.set(r.year, (yearlyMap.get(r.year) ?? 0) + r.amount);
    const yearly = Array.from(yearlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, amount]) => ({ year, amount, qty: 0 }));

    // Top products
    const productMap = new Map<string, { material: string; material_id: string; amount: number; qty: number }>();
    for (const r of filter(rawData.products)) {
      const ex = productMap.get(r.material_id);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else productMap.set(r.material_id, { material: r.material, material_id: r.material_id, amount: r.amount, qty: r.qty });
    }
    const products = Array.from(productMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 15);

    // Top partners
    const partnerMap = new Map<string, { partner_name: string; amount: number; qty: number; num_products: number }>();
    for (const r of filter(rawData.partners)) {
      const ex = partnerMap.get(r.partner_name);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else partnerMap.set(r.partner_name, { partner_name: r.partner_name, amount: r.amount, qty: r.qty, num_products: r.num_products });
    }
    const partners = Array.from(partnerMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 15);

    // Teams (filter by year only, not team — for donut chart)
    const teamMap = new Map<string, { home_team: string; amount: number; qty: number }>();
    for (const r of byYear(rawData.monthly)) {
      const ex = teamMap.get(r.home_team);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else teamMap.set(r.home_team, { home_team: r.home_team, amount: r.amount, qty: r.qty });
    }
    const teams = Array.from(teamMap.values()).sort((a, b) => b.amount - a.amount);

    // BRN totals
    const brnMap = new Map<string, { brn: string; amount: number; qty: number }>();
    for (const r of filter(rawData.brn)) {
      const ex = brnMap.get(r.brn);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else brnMap.set(r.brn, { brn: r.brn, amount: r.amount, qty: r.qty });
    }
    const brnTotals = Array.from(brnMap.values()).sort((a, b) => b.amount - a.amount);

    // KPI
    const totalAmount = monthlyFiltered.reduce((s, r) => s + r.amount, 0);
    const totalQty = monthlyFiltered.reduce((s, r) => s + r.qty, 0);
    const kpi = {
      total_amount: Math.round(totalAmount),
      total_qty: Math.round(totalQty * 100) / 100,
      num_partners: partnerMap.size || rawData.summary.overall.num_partners,
      num_products: productMap.size || rawData.summary.overall.num_products,
    };

    return { monthlyByYear, yearly, products, partners, teams, brnTotals, kpi };
  }, [rawData, selectedTeam, selectedYear]);

  async function handleLogout() {
    await fetch("/api/analytics/auth", { method: "DELETE" });
    router.push("/analytics/login");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/8 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold">eCommerce Analytics</h1>
              <p className="text-xs text-gray-500">
                {TEAM_LABELS[selectedTeam] || selectedTeam} · {selectedYear === "ALL" ? "전체 기간" : `${selectedYear}년`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rawData && (
              <button
                onClick={() => setShowUpload((v) => !v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  showUpload
                    ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400"
                    : "border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                파일 교체
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* No data state — show upload panel front and center */}
        {!rawData && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 text-sm mb-6">Excel 파일을 올리면 대시보드가 바로 표시됩니다.</p>
            <div className="w-full max-w-lg">
              <UploadPanel onData={(data) => { setRawData(data); setShowUpload(false); }} />
            </div>
          </div>
        )}

        {/* Upload panel (file replace) */}
        {rawData && showUpload && (
          <UploadPanel onData={(data) => { setRawData(data); setShowUpload(false); }} />
        )}

        {/* Dashboard */}
        {rawData && chartData && (
          <>
            <FilterBar
              teams={allTeams}
              years={allYears}
              selectedTeam={selectedTeam}
              selectedYear={selectedYear}
              onTeamChange={setSelectedTeam}
              onYearChange={setSelectedYear}
            />

            <KPICards kpi={chartData.kpi} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <MonthlySalesChart byYear={chartData.monthlyByYear} />
              </div>
              <div>
                {chartData.yearly.length > 0 && <YearlyBarChart data={chartData.yearly} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TeamDonutChart data={chartData.teams} />
              <BRNPieChart data={chartData.brnTotals} />
            </div>

            <TopProductsChart data={chartData.products} />
            <PartnerBarChart data={chartData.partners} />
          </>
        )}
      </main>
    </div>
  );
}
