"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import KPICards from "./KPICards";
import MonthlySalesChart from "./MonthlySalesChart";
import YearlyBarChart, { type YearlyStat } from "./YearlyBarChart";
import YTDChart from "./YTDChart";
import TopProductsChart from "./TopProductsChart";
import TeamDonutChart from "./TeamDonutChart";
import PartnerBarChart from "./PartnerBarChart";
import BRNPieChart, { MARKETPLACE_NAMES } from "./BRNPieChart";
import CommodityCompareChart from "./CommodityCompareChart";
import UploadPanel, { type ProcessedData } from "./UploadPanel";
import MarketplaceTrendChart from "./MarketplaceTrendChart";
import ProductGrowthChart, { type GrowthItem } from "./ProductGrowthChart";
import PartnerParetoChart from "./PartnerParetoChart";
import InsightPanel, { type InsightInputs } from "./InsightPanel";

const TEAMS = ["AAD", "ASD", "ISD", "EMD", "PSD", "IATD"] as const;
const MARKETPLACE_BRNS = ["2208162517", "1208800767", "1198666372", "2208183676", "8158101244"] as const;

const TEAM_COLORS: Record<string, string> = {
  AAD: "#fb923c", ASD: "#f87171", ISD: "#a78bfa",
  EMD: "#10b981", PSD: "#6366f1", IATD: "#f59e0b",
};
const MARKETPLACE_COLORS: Record<string, string> = {
  "2208162517": "#03c75a",
  "1208800767": "#ff6b00",
  "1198666372": "#6366f1",
  "2208183676": "#1a73e8",
  "8158101244": "#e11d48",
};

type ProductBrnItem = { material: string; material_id: string; brn: string; amount: number };

export default function DashboardClient({ initialTab = "overview" }: { initialTab?: string }) {
  const router = useRouter();
  const [rawData, setRawData] = useState<ProcessedData | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [showUpload, setShowUpload] = useState(false);

  const allYears = rawData?.summary.years ?? [];

  const isOverview = activeTab === "overview";
  const isMarketplace = activeTab.startsWith("brn_");
  const isTeam = !isOverview && !isMarketplace;
  const selectedBrn = isMarketplace ? activeTab.replace("brn_", "") : "ALL";
  const selectedTeam = isTeam ? activeTab : "ALL";

  const chartData = useMemo(() => {
    if (!rawData) return null;

    const byTeam = <T extends { home_team: string }>(d: T[]) =>
      selectedTeam === "ALL" ? d : d.filter((r) => r.home_team === selectedTeam);
    const byYear = <T extends { year: number }>(d: T[]) =>
      selectedYear === "ALL" ? d : d.filter((r) => r.year === parseInt(selectedYear));
    const filter = <T extends { home_team: string; year: number }>(d: T[]) =>
      byYear(byTeam(d));

    // ── Marketplace view ──────────────────────────────────────────────────
    if (isMarketplace) {
      const brnYear = <T extends { year: number }>(d: T[]) =>
        selectedYear === "ALL" ? d : d.filter(r => r.year === parseInt(selectedYear));

      const brnAllData = rawData.brn.filter(r => r.brn === selectedBrn);
      const brnFilt = brnYear(brnAllData);

      const monthlyByYear: Record<number, { month: number; amount: number; qty: number }[]> = {};
      for (const r of brnFilt) {
        if (!monthlyByYear[r.year]) monthlyByYear[r.year] = [];
        const ex = monthlyByYear[r.year].find(d => d.month === r.month);
        if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
        else monthlyByYear[r.year].push({ month: r.month, amount: r.amount, qty: r.qty });
      }
      const monthlyByYearAll: Record<number, { month: number; amount: number; qty: number }[]> = {};
      for (const r of brnAllData) {
        if (!monthlyByYearAll[r.year]) monthlyByYearAll[r.year] = [];
        const ex = monthlyByYearAll[r.year].find(d => d.month === r.month);
        if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
        else monthlyByYearAll[r.year].push({ month: r.month, amount: r.amount, qty: r.qty });
      }

      const yearlyMap = new Map<number, number>();
      for (const r of brnFilt) yearlyMap.set(r.year, (yearlyMap.get(r.year) ?? 0) + r.amount);
      const yearlyRawMP: YearlyStat[] = Array.from(yearlyMap.entries()).sort((a, b) => a[0] - b[0]).map(([year, amount]) => ({ year, amount, qty: 0 }));
      const yearly = (() => {
        if (yearlyRawMP.length < 2 || selectedYear !== "ALL") return yearlyRawMP;
        const latestYr = yearlyRawMP.at(-1)!.year;
        const prevYr = yearlyRawMP.at(-2)!.year;
        const brnMon = brnAllData.map(r => ({ year: r.year, month: r.month, amount: r.amount }));
        const latestMons = [...new Set(brnMon.filter(r => r.year === latestYr).map(r => r.month))].sort((a, b) => a - b);
        if (latestMons.length >= 12) return yearlyRawMP;
        let valid = latestMons;
        for (let d = 0; d < latestMons.length; d++) {
          const mons = latestMons.slice(0, latestMons.length - d);
          const ms = new Set(mons);
          const cur = brnMon.filter(r => r.year === latestYr && ms.has(r.month)).reduce((s, r) => s + r.amount, 0);
          const prev = brnMon.filter(r => r.year === prevYr && ms.has(r.month)).reduce((s, r) => s + r.amount, 0);
          if (prev === 0 || (cur - prev) / prev >= -0.8) { valid = mons; break; }
          if (d === latestMons.length - 1) valid = mons;
        }
        const ms = new Set(valid);
        const adjAmt = brnMon.filter(r => r.year === latestYr && ms.has(r.month)).reduce((s, r) => s + r.amount, 0);
        const cmpAmt = brnMon.filter(r => r.year === prevYr && ms.has(r.month)).reduce((s, r) => s + r.amount, 0);
        const maxMon = Math.max(...valid);
        return yearlyRawMP.map(y => y.year === latestYr ? { ...y, amount: adjAmt, compareAmount: cmpAmt, compareLabel: `vs ${prevYr} 1-${maxMon}월` } : y);
      })();

      const yearlyAllMap = new Map<number, number>();
      for (const r of brnAllData) yearlyAllMap.set(r.year, (yearlyAllMap.get(r.year) ?? 0) + r.amount);
      const yearlyAllArr = Array.from(yearlyAllMap.entries()).sort((a, b) => a[0] - b[0]);

      const ppFilt = brnYear(rawData.partnerProducts.filter(r => r.brn === selectedBrn));
      const productMap = new Map<string, { material: string; material_id: string; amount: number; qty: number }>();
      for (const r of ppFilt) {
        const ex = productMap.get(r.material_id);
        if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
        else productMap.set(r.material_id, { material: r.material, material_id: r.material_id, amount: r.amount, qty: r.qty });
      }
      const products = Array.from(productMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 50);

      const pbFilt = brnYear(rawData.partnerBrn.filter(r => r.brn === selectedBrn));
      const teamMap = new Map<string, { home_team: string; amount: number; qty: number }>();
      for (const r of pbFilt) {
        const ex = teamMap.get(r.home_team);
        if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
        else teamMap.set(r.home_team, { home_team: r.home_team, amount: r.amount, qty: r.qty });
      }
      const teams = Array.from(teamMap.values()).sort((a, b) => b.amount - a.amount);

      const brnLatest = yearly.at(-1);
      const brnPrev = yearly.at(-2);
      let brnPrevAmount: number | undefined;
      let brnYoyRate: number | undefined;
      if (brnLatest && brnPrev && selectedYear === "ALL") {
        brnPrevAmount = brnLatest.compareAmount ?? brnPrev.amount;
        brnYoyRate = brnPrevAmount > 0 ? (brnLatest.amount - brnPrevAmount) / brnPrevAmount * 100 : undefined;
      }
      const brnCompletedYears = yearly.filter(y => !y.compareLabel);
      let brnCagr: number | undefined;
      if (brnCompletedYears.length >= 2) {
        const first = brnCompletedYears[0].amount;
        const last = brnCompletedYears.at(-1)!.amount;
        const n = brnCompletedYears.length - 1;
        if (first > 0) brnCagr = (Math.pow(last / first, 1 / n) - 1) * 100;
      }

      const kpi = {
        total_amount: Math.round(brnFilt.reduce((s, r) => s + r.amount, 0)),
        total_qty: Math.round(brnFilt.reduce((s, r) => s + r.qty, 0) * 100) / 100,
        num_partners: new Set(pbFilt.map(r => r.partner_name)).size,
        num_products: new Set(ppFilt.map(r => r.material_id)).size,
        prev_amount: brnPrevAmount,
        yoy_rate: brnYoyRate,
        cagr: brnCagr,
      };

      let growthRate: number | null = null;
      if (yearlyAllArr.length >= 2) {
        const rates: number[] = [];
        for (let i = 1; i < yearlyAllArr.length; i++) {
          if (yearlyAllArr[i - 1][1] > 0) rates.push((yearlyAllArr[i][1] - yearlyAllArr[i - 1][1]) / yearlyAllArr[i - 1][1]);
        }
        if (rates.length > 0) growthRate = (rates.reduce((s, r) => s + r, 0) / rates.length) * 100;
      }

      // Product YoY growth for marketplace
      const brnYears = [...new Set(brnAllData.map((r) => r.year))].sort();
      const growthTargetYear = brnYears.at(-1) ?? 0;
      const growthPrevYear = brnYears.at(-2) ?? 0;
      const topGrowing: GrowthItem[] = [];
      const topDeclining: GrowthItem[] = [];
      if (growthPrevYear && growthTargetYear) {
        const curPMap = new Map<string, { material: string; amount: number }>();
        const prevPMap = new Map<string, { material: string; amount: number }>();
        for (const r of rawData.partnerProducts.filter((r2) => r2.brn === selectedBrn)) {
          const map = r.year === growthTargetYear ? curPMap : r.year === growthPrevYear ? prevPMap : null;
          if (!map) continue;
          const ex = map.get(r.material_id);
          if (ex) ex.amount += r.amount;
          else map.set(r.material_id, { material: r.material, amount: r.amount });
        }
        const items: GrowthItem[] = [];
        for (const [mid, cur] of curPMap) {
          const prev = prevPMap.get(mid);
          if (!prev || prev.amount === 0 || cur.amount < 5_000_000) continue;
          items.push({ material: cur.material, material_id: mid, currentAmount: cur.amount, prevAmount: prev.amount, changePct: (cur.amount - prev.amount) / prev.amount * 100 });
        }
        topGrowing.push(...items.filter((g) => g.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 10));
        topDeclining.push(...items.filter((g) => g.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 10));
      }

      // All partners for Pareto (no year filter for full picture)
      const partnersAllBrnMap = new Map<string, { partner_name: string; amount: number }>();
      for (const r of rawData.partnerBrn.filter((r2) => r2.brn === selectedBrn)) {
        const ex = partnersAllBrnMap.get(r.partner_name);
        if (ex) ex.amount += r.amount;
        else partnersAllBrnMap.set(r.partner_name, { partner_name: r.partner_name, amount: r.amount });
      }
      const partnersAll = Array.from(partnersAllBrnMap.values()).sort((a, b) => b.amount - a.amount);

      return { monthlyByYear, monthlyByYearAll, yearly, products, productBrn: [] as ProductBrnItem[], partners: [] as { partner_name: string; amount: number; qty: number; num_products: number }[], teams, brnTotals: [] as { brn: string; amount: number; qty: number }[], kpi, partnerBrn: pbFilt, partnerProducts: ppFilt, growthRate, mpTrendData: [] as Record<string, number | string>[], partnersAll, topGrowing, topDeclining, growthTargetYear, growthPrevYear };
    }

    // ── Overview / Team view ───────────────────────────────────────────────
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
    const yearlyRaw: YearlyStat[] = Array.from(yearlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, amount]) => ({ year, amount, qty: 0 }));
    const yearly = (() => {
      if (yearlyRaw.length < 2 || selectedYear !== "ALL") return yearlyRaw;
      const latestYr = yearlyRaw.at(-1)!.year;
      const prevYr = yearlyRaw.at(-2)!.year;
      const allMon = byTeam(rawData.monthly).map(r => ({ year: r.year, month: r.month, amount: r.amount }));
      const latestMons = [...new Set(allMon.filter(r => r.year === latestYr).map(r => r.month))].sort((a, b) => a - b);
      if (latestMons.length >= 12) return yearlyRaw;
      let valid = latestMons;
      for (let d = 0; d < latestMons.length; d++) {
        const mons = latestMons.slice(0, latestMons.length - d);
        const ms = new Set(mons);
        const cur = allMon.filter(r => r.year === latestYr && ms.has(r.month)).reduce((s, r) => s + r.amount, 0);
        const prev = allMon.filter(r => r.year === prevYr && ms.has(r.month)).reduce((s, r) => s + r.amount, 0);
        if (prev === 0 || (cur - prev) / prev >= -0.8) { valid = mons; break; }
        if (d === latestMons.length - 1) valid = mons;
      }
      const ms = new Set(valid);
      const adjAmt = allMon.filter(r => r.year === latestYr && ms.has(r.month)).reduce((s, r) => s + r.amount, 0);
      const cmpAmt = allMon.filter(r => r.year === prevYr && ms.has(r.month)).reduce((s, r) => s + r.amount, 0);
      const maxMon = Math.max(...valid);
      return yearlyRaw.map(y => y.year === latestYr ? { ...y, amount: adjAmt, compareAmount: cmpAmt, compareLabel: `vs ${prevYr} 1-${maxMon}월` } : y);
    })();

    const monthlyByYearAll: Record<number, { month: number; amount: number; qty: number }[]> = {};
    for (const r of byTeam(rawData.monthly)) {
      if (!monthlyByYearAll[r.year]) monthlyByYearAll[r.year] = [];
      const ex = monthlyByYearAll[r.year].find((d) => d.month === r.month);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else monthlyByYearAll[r.year].push({ month: r.month, amount: r.amount, qty: r.qty });
    }

    const productMap = new Map<string, { material: string; material_id: string; amount: number; qty: number }>();
    for (const r of filter(rawData.products)) {
      const ex = productMap.get(r.material_id);
      if (ex) { ex.amount += r.amount; ex.qty += r.qty; }
      else productMap.set(r.material_id, { material: r.material, material_id: r.material_id, amount: r.amount, qty: r.qty });
    }
    const products = Array.from(productMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 50);

    const productBrnMap = new Map<string, ProductBrnItem>();
    for (const r of filter(rawData.partnerProducts)) {
      const k = `${r.material_id}|${r.brn}`;
      const ex = productBrnMap.get(k);
      if (ex) ex.amount += r.amount;
      else productBrnMap.set(k, { material: r.material, material_id: r.material_id, brn: r.brn, amount: r.amount });
    }
    const productBrn = Array.from(productBrnMap.values());

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

    // Q1 2026 vs Q1 2025
    const allTeamMonthly = byTeam(rawData.monthly);
    const q1Current = Math.round(allTeamMonthly.filter(r => r.year === 2026 && r.month <= 3).reduce((s, r) => s + r.amount, 0));
    const q1Prev = Math.round(allTeamMonthly.filter(r => r.year === 2025 && r.month <= 3).reduce((s, r) => s + r.amount, 0));
    const yoyRate: number | undefined = q1Prev > 0 ? (q1Current - q1Prev) / q1Prev * 100 : undefined;

    // CAGR 2023~2025 (full years only)
    const yr2023 = Math.round(allTeamMonthly.filter(r => r.year === 2023).reduce((s, r) => s + r.amount, 0));
    const yr2025 = Math.round(allTeamMonthly.filter(r => r.year === 2025).reduce((s, r) => s + r.amount, 0));
    const cagrVal: number | undefined = yr2023 > 0 && yr2025 > 0
      ? (Math.pow(yr2025 / yr2023, 1 / 2) - 1) * 100
      : undefined;

    const kpi = {
      total_amount: Math.round(totalAmount),
      total_qty: Math.round(totalQty * 100) / 100,
      num_partners: partnerMap.size || rawData.summary.overall.num_partners,
      num_products: productMap.size || rawData.summary.overall.num_products,
      q1_current: q1Current || undefined,
      q1_prev: q1Prev || undefined,
      yoy_rate: yoyRate,
      cagr: cagrVal,
    };

    const partnerBrn = filter(rawData.partnerBrn);
    const partnerProducts = filter(rawData.partnerProducts);

    // Average YoY growth rate (all years, team-filtered)
    const yearlyAllArr = Object.entries(monthlyByYearAll)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, months]) => months.reduce((s, m) => s + m.amount, 0));
    let growthRate: number | null = null;
    if (yearlyAllArr.length >= 2) {
      const rates: number[] = [];
      for (let i = 1; i < yearlyAllArr.length; i++) {
        if (yearlyAllArr[i - 1] > 0) rates.push((yearlyAllArr[i] - yearlyAllArr[i - 1]) / yearlyAllArr[i - 1]);
      }
      if (rates.length > 0) growthRate = (rates.reduce((s, r) => s + r, 0) / rates.length) * 100;
    }

    // Marketplace share trend (% of total per year)
    const mpTrendMap: Record<number, Record<string, number>> = {};
    for (const r of byTeam(rawData.brn)) {
      if (!mpTrendMap[r.year]) mpTrendMap[r.year] = {};
      mpTrendMap[r.year][r.brn] = (mpTrendMap[r.year][r.brn] || 0) + r.amount;
    }
    const mpTrendData = Object.entries(mpTrendMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([yr, brnMap]) => {
        const total = Object.values(brnMap).reduce((s, v) => s + v, 0);
        const row: Record<string, number | string> = { year: Number(yr) };
        for (const brn of MARKETPLACE_BRNS) {
          row[MARKETPLACE_NAMES[brn]] = total > 0 ? Math.round((brnMap[brn] || 0) / total * 1000) / 10 : 0;
        }
        return row;
      });

    // All partners for Pareto (unsliced)
    const partnersAll = Array.from(partnerMap.values()).sort((a, b) => b.amount - a.amount);

    // Product YoY growth
    const sortedYearsArr = [...allYears].sort();
    const growthTargetYear = sortedYearsArr.at(-1) ?? 0;
    const growthPrevYear = sortedYearsArr.at(-2) ?? 0;
    const topGrowing: GrowthItem[] = [];
    const topDeclining: GrowthItem[] = [];
    if (growthPrevYear && growthTargetYear) {
      const curPMap = new Map<string, { material: string; amount: number }>();
      const prevPMap = new Map<string, { material: string; amount: number }>();
      for (const r of byTeam(rawData.products)) {
        const map = r.year === growthTargetYear ? curPMap : r.year === growthPrevYear ? prevPMap : null;
        if (!map) continue;
        const ex = map.get(r.material_id);
        if (ex) ex.amount += r.amount;
        else map.set(r.material_id, { material: r.material, amount: r.amount });
      }
      const items: GrowthItem[] = [];
      for (const [mid, cur] of curPMap) {
        const prev = prevPMap.get(mid);
        if (!prev || prev.amount === 0 || cur.amount < 5_000_000) continue;
        items.push({ material: cur.material, material_id: mid, currentAmount: cur.amount, prevAmount: prev.amount, changePct: (cur.amount - prev.amount) / prev.amount * 100 });
      }
      topGrowing.push(...items.filter((g) => g.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 10));
      topDeclining.push(...items.filter((g) => g.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 10));
    }

    return { monthlyByYear, monthlyByYearAll, yearly, products, productBrn, partners, teams, brnTotals, kpi, partnerBrn, partnerProducts, growthRate, mpTrendData, partnersAll, topGrowing, topDeclining, growthTargetYear, growthPrevYear };
  }, [rawData, selectedTeam, selectedYear, isMarketplace, selectedBrn]);

  const commodityMonthlyByTeam = useMemo(() => {
    if (!rawData || isMarketplace) return [];
    return selectedTeam === "ALL"
      ? rawData.commodityMonthly
      : rawData.commodityMonthly.filter(r => r.home_team === selectedTeam);
  }, [rawData, selectedTeam, isMarketplace]);

  async function handleLogout() {
    await fetch("/api/analytics/auth", { method: "DELETE" });
    router.push("/analytics/login");
  }

  const mpName = isMarketplace ? (MARKETPLACE_NAMES[selectedBrn] || selectedBrn) : "";
  const pageTitle = isOverview ? "Overview" : isMarketplace ? mpName : activeTab;
  const pageSubtitle = isOverview ? "전체 현황" : isMarketplace ? "마켓플레이스 현황" : `${activeTab} Home Team`;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full shrink-0 z-10">
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

          {/* Marketplaces */}
          <div className="pt-4 pb-1.5 px-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Marketplaces</p>
          </div>
          {MARKETPLACE_BRNS.map((brn) => (
            <button
              key={brn}
              onClick={() => setActiveTab(`brn_${brn}`)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === `brn_${brn}` ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MARKETPLACE_COLORS[brn] }} />
              {MARKETPLACE_NAMES[brn] || brn}
            </button>
          ))}

          {/* Home Teams */}
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

      {/* Main — true scroll container so sticky top-0 on header works */}
      <div className="flex-1 overflow-y-auto">
        {!rawData ? (
          <div className="flex flex-col items-center justify-center min-h-full py-16 px-8">
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

            {/* Sticky page header */}
            <div className="sticky top-0 z-20 bg-[#f8fafc] px-8 pt-5 pb-3 flex items-start justify-between border-b border-gray-100">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {pageSubtitle}{selectedYear !== "ALL" && ` · ${selectedYear}년`}
                </p>
              </div>
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

            {/* Dashboard content */}
            {chartData && (
              <div className="px-8 pb-10 pt-4 space-y-5">
                <KPICards
                  kpi={chartData.kpi}
                  visibleKeys={isOverview
                    ? ["q1_current", "q1_prev", "yoy_rate", "cagr"]
                    : ["total_amount", "total_qty", "num_partners", "num_products"]}
                  growthRate={isOverview ? null : chartData.growthRate}
                />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  <div className="xl:col-span-2">
                    <MonthlySalesChart byYear={chartData.monthlyByYear} />
                  </div>
                  <YearlyBarChart data={chartData.yearly} />
                </div>

                <YTDChart byYear={chartData.monthlyByYearAll} />

                {isOverview && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <TeamDonutChart data={chartData.teams} />
                      <BRNPieChart data={chartData.brnTotals} />
                    </div>
                    <MarketplaceTrendChart data={chartData.mpTrendData} />
                    <TopProductsChart data={chartData.products} productBrn={chartData.productBrn} />
                    <ProductGrowthChart topGrowing={chartData.topGrowing} topDeclining={chartData.topDeclining} currentYear={chartData.growthTargetYear} prevYear={chartData.growthPrevYear} />
                    <PartnerBarChart partnerBrn={chartData.partnerBrn} partnerProducts={chartData.partnerProducts} />
                    <PartnerParetoChart data={chartData.partnersAll} />
                    <InsightPanel
                      tabType="overview" tabName="Overview"
                      kpi={chartData.kpi} yearly={chartData.yearly}
                      topProducts={chartData.products.slice(0, 10)}
                      partnersAll={chartData.partnersAll}
                      growthRate={chartData.growthRate}
                      topGrowing={chartData.topGrowing} topDeclining={chartData.topDeclining}
                      brnTotals={chartData.brnTotals} teams={chartData.teams}
                      growthTargetYear={chartData.growthTargetYear} growthPrevYear={chartData.growthPrevYear}
                    />
                  </>
                )}

                {isMarketplace && (
                  <>
                    <TeamDonutChart data={chartData.teams} />
                    <TopProductsChart data={chartData.products} productBrn={[]} />
                    <ProductGrowthChart topGrowing={chartData.topGrowing} topDeclining={chartData.topDeclining} currentYear={chartData.growthTargetYear} prevYear={chartData.growthPrevYear} />
                    <PartnerBarChart partnerBrn={chartData.partnerBrn} partnerProducts={chartData.partnerProducts} />
                    <PartnerParetoChart data={chartData.partnersAll} />
                    <InsightPanel
                      tabType="marketplace" tabName={mpName}
                      kpi={chartData.kpi} yearly={chartData.yearly}
                      topProducts={chartData.products.slice(0, 10)}
                      partnersAll={chartData.partnersAll}
                      growthRate={chartData.growthRate}
                      topGrowing={chartData.topGrowing} topDeclining={chartData.topDeclining}
                      growthTargetYear={chartData.growthTargetYear} growthPrevYear={chartData.growthPrevYear}
                    />
                  </>
                )}

                {isTeam && (
                  <>
                    <CommodityCompareChart
                      data={commodityMonthlyByTeam}
                      allYears={rawData.summary.years}
                    />
                    <TopProductsChart data={chartData.products} productBrn={chartData.productBrn} />
                    <ProductGrowthChart topGrowing={chartData.topGrowing} topDeclining={chartData.topDeclining} currentYear={chartData.growthTargetYear} prevYear={chartData.growthPrevYear} />
                    <PartnerBarChart partnerBrn={chartData.partnerBrn} partnerProducts={chartData.partnerProducts} />
                    <PartnerParetoChart data={chartData.partnersAll} />
                    <BRNPieChart data={chartData.brnTotals} />
                    <InsightPanel
                      tabType="team" tabName={activeTab}
                      kpi={chartData.kpi} yearly={chartData.yearly}
                      topProducts={chartData.products.slice(0, 10)}
                      partnersAll={chartData.partnersAll}
                      growthRate={chartData.growthRate}
                      topGrowing={chartData.topGrowing} topDeclining={chartData.topDeclining}
                      brnTotals={chartData.brnTotals}
                      growthTargetYear={chartData.growthTargetYear} growthPrevYear={chartData.growthPrevYear}
                    />
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
