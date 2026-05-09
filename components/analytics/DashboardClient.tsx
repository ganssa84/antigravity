"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import KPICards from "./KPICards";
import MonthlySalesChart from "./MonthlySalesChart";
import YearlyBarChart from "./YearlyBarChart";
import TopProductsChart from "./TopProductsChart";
import TeamDonutChart from "./TeamDonutChart";
import PartnerBarChart from "./PartnerBarChart";
import BRNPieChart from "./BRNPieChart";
import FilterBar from "./FilterBar";
import UploadPanel from "./UploadPanel";

type KPI = { total_amount: number; total_qty: number; num_partners: number; num_products: number };
type Summary = {
  overall: KPI & { num_customers: number };
  by_team: Record<string, KPI & { num_customers: number }>;
  by_year: Record<string, KPI & { num_customers: number }>;
  teams: string[];
  years: number[];
  brns: string[];
};
type MonthlyData = {
  monthly: { year: number; month: number; amount: number; qty: number }[];
  byYear: Record<number, { month: number; amount: number; qty: number }[]>;
};

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
  const [selectedTeam, setSelectedTeam] = useState(initialTeam);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [showUpload, setShowUpload] = useState(false);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [products, setProducts] = useState<{ material: string; material_id: string; amount: number; qty: number }[]>([]);
  const [partners, setPartners] = useState<{ partner_name: string; amount: number; qty: number; num_products: number }[]>([]);
  const [teamStats, setTeamStats] = useState<{ home_team: string; amount: number; qty: number }[]>([]);
  const [brnTotals, setBrnTotals] = useState<{ brn: string; amount: number; qty: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const buildQuery = (team: string, year: string) => {
    const p = new URLSearchParams();
    if (team !== "ALL") p.set("team", team);
    if (year !== "ALL") p.set("year", year);
    return p.toString() ? `?${p}` : "";
  };

  const fetchAll = useCallback(async (team: string, year: string) => {
    setLoading(true);
    const q = buildQuery(team, year);
    const yq = year !== "ALL" ? `?year=${year}` : "";
    try {
      const [sRes, mRes, pRes, ptRes, tRes, bRes] = await Promise.all([
        fetch(`/api/analytics/summary${q}`),
        fetch(`/api/analytics/monthly${q}`),
        fetch(`/api/analytics/products${q}&limit=15`),
        fetch(`/api/analytics/partners${q}`),
        fetch(`/api/analytics/teams${yq}`),
        fetch(`/api/analytics/brn${q}`),
      ]);
      const [sData, mData, pData, ptData, tData, bData] = await Promise.all([
        sRes.json(), mRes.json(), pRes.json(), ptRes.json(), tRes.json(), bRes.json(),
      ]);
      setSummary(sData.teams ? sData : null);
      setMonthly(mData);
      setProducts(pData);
      setPartners(ptData);
      setTeamStats(tData);
      setBrnTotals(bData.totals ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(selectedTeam, selectedYear);
  }, [fetchAll, selectedTeam, selectedYear]);

  const kpi: KPI | null = summary
    ? selectedTeam === "ALL"
      ? { total_amount: summary.overall.total_amount, total_qty: summary.overall.total_qty, num_partners: summary.overall.num_partners, num_products: summary.overall.num_products }
      : { total_amount: summary.by_team[selectedTeam]?.total_amount ?? 0, total_qty: summary.by_team[selectedTeam]?.total_qty ?? 0, num_partners: summary.by_team[selectedTeam]?.num_partners ?? 0, num_products: summary.by_team[selectedTeam]?.num_products ?? 0 }
    : null;

  // Build yearly summary from monthly data
  const yearlySummary = monthly
    ? Object.entries(
        monthly.monthly.reduce<Record<number, number>>((acc, r) => {
          acc[r.year] = (acc[r.year] ?? 0) + r.amount;
          return acc;
        }, {})
      )
        .map(([year, amount]) => ({ year: parseInt(year), amount, qty: 0 }))
        .sort((a, b) => a.year - b.year)
    : [];

  async function handleLogout() {
    await fetch("/api/analytics/auth", { method: "DELETE" });
    router.push("/analytics/login");
  }

  const allTeams = summary?.teams ?? [];
  const allYears = summary?.years ?? [];

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
              데이터 업데이트
            </button>
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
        {/* Upload panel */}
        {showUpload && (
          <UploadPanel
            onDone={() => {
              setShowUpload(false);
              fetchAll(selectedTeam, selectedYear);
            }}
          />
        )}

        {/* Filter bar */}
        <FilterBar
          teams={allTeams}
          years={allYears}
          selectedTeam={selectedTeam}
          selectedYear={selectedYear}
          onTeamChange={setSelectedTeam}
          onYearChange={setSelectedYear}
        />

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              데이터 불러오는 중...
            </div>
          </div>
        )}

        {!loading && (
          <>
            <KPICards kpi={kpi} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                {monthly?.byYear && <MonthlySalesChart byYear={monthly.byYear} />}
              </div>
              <div>
                {yearlySummary.length > 0 && <YearlyBarChart data={yearlySummary} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TeamDonutChart data={teamStats} />
              <BRNPieChart data={brnTotals} />
            </div>

            <TopProductsChart data={products} />

            <PartnerBarChart data={partners} />
          </>
        )}
      </main>
    </div>
  );
}
