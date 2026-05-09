import fs from "fs";
import path from "path";
import { loadAnalyticsCache } from "./analytics-supabase";

const DATA_DIR = path.join(process.cwd(), "data", "analytics");

function readLocalJson<T>(filename: string): T | null {
  try {
    const file = path.join(DATA_DIR, filename);
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function getData<T>(key: "summary" | "monthly" | "products" | "partners" | "brn" | "commodity", filename: string): Promise<T> {
  // 1. Try Supabase first
  const remote = await loadAnalyticsCache<T>(key);
  if (remote) return remote;

  // 2. Fall back to local JSON file (for initial local dev)
  const local = readLocalJson<T>(filename);
  if (local) return local;

  throw new Error(`No analytics data found for '${key}'. Please upload an Excel file via the dashboard.`);
}

export type MonthlyStat = {
  year: number; month: number; home_team: string; amount: number; qty: number;
};
export type ProductStat = {
  material: string; material_id: string; home_team: string; year: number; amount: number; qty: number;
};
export type PartnerStat = {
  partner_name: string; home_team: string; year: number; amount: number; qty: number; num_products: number;
};
export type BrnStat = {
  brn: string; home_team: string; year: number; month: number; amount: number; qty: number;
};
export type CommodityStat = {
  commodity: number; home_team: string; year: number; amount: number; qty: number; num_products: number;
};
export type Summary = {
  overall: { total_amount: number; total_qty: number; num_partners: number; num_products: number; num_customers: number };
  by_team: Record<string, { total_amount: number; total_qty: number; num_partners: number; num_products: number; num_customers: number }>;
  by_year: Record<string, { total_amount: number; total_qty: number; num_partners: number; num_products: number; num_customers: number }>;
  teams: string[];
  years: number[];
  brns: string[];
};

export const getMonthly = () => getData<MonthlyStat[]>("monthly", "monthly.json");
export const getProducts = () => getData<ProductStat[]>("products", "products.json");
export const getPartners = () => getData<PartnerStat[]>("partners", "partners.json");
export const getBrn = () => getData<BrnStat[]>("brn", "brn.json");
export const getCommodity = () => getData<CommodityStat[]>("commodity", "commodity.json");
export const getSummary = () => getData<Summary>("summary", "summary.json");

export function filterByTeam<T extends { home_team: string }>(data: T[], team?: string | null): T[] {
  if (!team || team === "ALL") return data;
  return data.filter((r) => r.home_team === team);
}
export function filterByYear<T extends { year: number }>(data: T[], year?: string | null): T[] {
  if (!year || year === "ALL") return data;
  return data.filter((r) => r.year === parseInt(year));
}
