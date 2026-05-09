import { NextRequest, NextResponse } from "next/server";
import { getMonthly, filterByYear } from "@/lib/analytics-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  const monthly = await getMonthly();
  const filtered = filterByYear(monthly, year);

  // Aggregate by home_team
  const map = new Map<string, { home_team: string; amount: number; qty: number }>();
  for (const r of filtered) {
    const existing = map.get(r.home_team);
    if (existing) {
      existing.amount += r.amount;
      existing.qty += r.qty;
    } else {
      map.set(r.home_team, { home_team: r.home_team, amount: r.amount, qty: r.qty });
    }
  }

  const result = Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .map((r) => ({ ...r, amount: Math.round(r.amount), qty: Math.round(r.qty * 100) / 100 }));

  return NextResponse.json(result);
}
