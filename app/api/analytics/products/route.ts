import { NextRequest, NextResponse } from "next/server";
import { getProducts, filterByTeam, filterByYear } from "@/lib/analytics-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");
  const year = searchParams.get("year");
  const limit = parseInt(searchParams.get("limit") || "15");
  const sortBy = searchParams.get("sortBy") || "amount"; // "amount" | "qty"

  const products = await getProducts();
  const filtered = filterByYear(filterByTeam(products, team), year);

  // Aggregate by material
  const map = new Map<string, { material: string; material_id: string; amount: number; qty: number }>();
  for (const r of filtered) {
    const existing = map.get(r.material_id);
    if (existing) {
      existing.amount += r.amount;
      existing.qty += r.qty;
    } else {
      map.set(r.material_id, {
        material: r.material,
        material_id: r.material_id,
        amount: r.amount,
        qty: r.qty,
      });
    }
  }

  const result = Array.from(map.values())
    .sort((a, b) => (sortBy === "qty" ? b.qty - a.qty : b.amount - a.amount))
    .slice(0, limit)
    .map((r) => ({ ...r, amount: Math.round(r.amount), qty: Math.round(r.qty * 100) / 100 }));

  return NextResponse.json(result);
}
