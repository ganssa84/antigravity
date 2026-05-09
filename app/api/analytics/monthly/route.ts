import { NextRequest, NextResponse } from "next/server";
import { getMonthly, filterByTeam, filterByYear } from "@/lib/analytics-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");
  const year = searchParams.get("year");

  const monthly = await getMonthly();
  const filtered = filterByYear(filterByTeam(monthly, team), year);

  // Aggregate: sum by year × month (across selected teams)
  const map = new Map<string, { year: number; month: number; amount: number; qty: number }>();
  for (const r of filtered) {
    const key = `${r.year}-${r.month}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += r.amount;
      existing.qty += r.qty;
    } else {
      map.set(key, { year: r.year, month: r.month, amount: r.amount, qty: r.qty });
    }
  }

  const result = Array.from(map.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map((r) => ({ ...r, amount: Math.round(r.amount), qty: Math.round(r.qty * 100) / 100 }));

  // Also return grouped by year for multi-year line chart
  const byYear = new Map<number, { month: number; amount: number; qty: number }[]>();
  for (const r of filtered) {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    const yearData = byYear.get(r.year)!;
    const existing = yearData.find((d) => d.month === r.month);
    if (existing) {
      existing.amount += r.amount;
      existing.qty += r.qty;
    } else {
      yearData.push({ month: r.month, amount: r.amount, qty: r.qty });
    }
  }

  const byYearResult: Record<number, { month: number; amount: number; qty: number }[]> = {};
  for (const [yr, data] of byYear.entries()) {
    byYearResult[yr] = data
      .sort((a, b) => a.month - b.month)
      .map((r) => ({ ...r, amount: Math.round(r.amount) }));
  }

  return NextResponse.json({ monthly: result, byYear: byYearResult });
}
