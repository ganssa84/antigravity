import { NextRequest, NextResponse } from "next/server";
import { getSummary, getMonthly, filterByTeam, filterByYear } from "@/lib/analytics-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");
  const year = searchParams.get("year");

  const summary = await getSummary();

  if (!team && !year) {
    return NextResponse.json(summary);
  }

  const monthly = await getMonthly();
  const filtered = filterByYear(filterByTeam(monthly, team), year);

  const total_amount = filtered.reduce((s, r) => s + r.amount, 0);
  const total_qty = filtered.reduce((s, r) => s + r.qty, 0);

  const result = {
    total_amount: Math.round(total_amount),
    total_qty: Math.round(total_qty * 100) / 100,
    teams: summary.teams,
    years: summary.years,
    brns: summary.brns,
  };

  return NextResponse.json(result);
}
