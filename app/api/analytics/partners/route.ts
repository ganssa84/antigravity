import { NextRequest, NextResponse } from "next/server";
import { getPartners, filterByTeam, filterByYear } from "@/lib/analytics-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");
  const year = searchParams.get("year");
  const limit = parseInt(searchParams.get("limit") || "15");

  const partners = await getPartners();
  const filtered = filterByYear(filterByTeam(partners, team), year);

  // Aggregate by partner_name
  const map = new Map<string, { partner_name: string; amount: number; qty: number; num_products: number }>();
  for (const r of filtered) {
    const existing = map.get(r.partner_name);
    if (existing) {
      existing.amount += r.amount;
      existing.qty += r.qty;
      existing.num_products = Math.max(existing.num_products, r.num_products);
    } else {
      map.set(r.partner_name, {
        partner_name: r.partner_name,
        amount: r.amount,
        qty: r.qty,
        num_products: r.num_products,
      });
    }
  }

  const result = Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((r) => ({ ...r, amount: Math.round(r.amount), qty: Math.round(r.qty * 100) / 100 }));

  return NextResponse.json(result);
}
