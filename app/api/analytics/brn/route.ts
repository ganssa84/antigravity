import { NextRequest, NextResponse } from "next/server";
import { getBrn, filterByTeam, filterByYear } from "@/lib/analytics-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");
  const year = searchParams.get("year");

  const brnData = await getBrn();
  const filtered = filterByYear(filterByTeam(brnData, team), year);

  // Aggregate by brn
  const map = new Map<string, { brn: string; amount: number; qty: number }>();
  for (const r of filtered) {
    const existing = map.get(r.brn);
    if (existing) {
      existing.amount += r.amount;
      existing.qty += r.qty;
    } else {
      map.set(r.brn, { brn: r.brn, amount: r.amount, qty: r.qty });
    }
  }

  const totals = Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .map((r) => ({ ...r, amount: Math.round(r.amount), qty: Math.round(r.qty * 100) / 100 }));

  // Monthly trend per BRN
  const monthlyMap = new Map<string, { brn: string; year: number; month: number; amount: number }>();
  for (const r of filtered) {
    const key = `${r.brn}-${r.year}-${r.month}`;
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.amount += r.amount;
    } else {
      monthlyMap.set(key, { brn: r.brn, year: r.year, month: r.month, amount: r.amount });
    }
  }

  const monthly = Array.from(monthlyMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map((r) => ({ ...r, amount: Math.round(r.amount) }));

  return NextResponse.json({ totals, monthly });
}
