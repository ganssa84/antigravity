import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export interface Product {
  id: number;
  name: string;
  cost_usd: number | null;
  cost_krw: number | null;
  selling_price: number | null;
  shipping_cost: number;
  margin: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface InventoryItem extends Product {
  quantity: number;
}

export interface SaleRecord {
  id: number;
  product_id: number;
  quantity: number;
  sale_date: string;
  note: string | null;
  naver_order_id: string | null;
  created_at: string;
  product?: { name: string };
}

export interface StockInRecord {
  id: number;
  product_id: number;
  quantity: number;
  stock_date: string;
  note: string | null;
  created_at: string;
  product?: { name: string };
}

export interface NaverMapping {
  id: number;
  product_id: number;
  naver_product_name: string;
  naver_option_name: string | null;
}

// ── 재고 조회 ─────────────────────────────────────────────────
export async function getInventory(): Promise<InventoryItem[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from("heartain_inventory")
    .select(`
      quantity,
      heartain_products (
        id, name, cost_usd, cost_krw, selling_price,
        shipping_cost, margin, is_active, sort_order
      )
    `)
    .order("heartain_products(name)");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row.heartain_products,
    quantity: row.quantity,
  }));
}

// ── 제품 전체 조회 ─────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await getClient()
    .from("heartain_products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

// ── 판매 기록 추가 (재고 차감 포함) ──────────────────────────────
export async function addSale(
  productId: number,
  quantity: number,
  saleDate: string,
  note?: string,
  naverOrderId?: string,
  couponDiscount?: number
) {
  const sb = getClient();

  // 재고 확인
  const { data: inv } = await sb
    .from("heartain_inventory")
    .select("quantity")
    .eq("product_id", productId)
    .single();

  if (!inv || inv.quantity < quantity) {
    throw new Error("재고 부족");
  }

  // 판매 기록 삽입
  const { error: saleError } = await sb.from("heartain_sales").insert({
    product_id: productId,
    quantity,
    sale_date: saleDate,
    note: note ?? null,
    naver_order_id: naverOrderId ?? null,
    coupon_discount: couponDiscount ?? 0,
  });
  if (saleError) throw saleError;

  // 재고 차감
  const { error: invError } = await sb
    .from("heartain_inventory")
    .update({
      quantity: inv.quantity - quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId);
  if (invError) throw invError;
}

// ── 입고 추가 (재고 증가 포함) ─────────────────────────────────
export async function addStockIn(
  productId: number,
  quantity: number,
  stockDate: string,
  note?: string
) {
  const sb = getClient();

  const { error: stockError } = await sb.from("heartain_stock_in").insert({
    product_id: productId,
    quantity,
    stock_date: stockDate,
    note: note ?? null,
  });
  if (stockError) throw stockError;

  // 재고 증가 (upsert)
  const { data: inv } = await sb
    .from("heartain_inventory")
    .select("quantity")
    .eq("product_id", productId)
    .single();

  await sb.from("heartain_inventory").upsert({
    product_id: productId,
    quantity: (inv?.quantity ?? 0) + quantity,
    updated_at: new Date().toISOString(),
  });
}

// ── 판매 기록 조회 ─────────────────────────────────────────────
export async function getSales(fromDate?: string, toDate?: string): Promise<SaleRecord[]> {
  let query = getClient()
    .from("heartain_sales")
    .select("*, product:heartain_products(name)")
    .order("sale_date", { ascending: false });

  if (fromDate) query = query.gte("sale_date", fromDate);
  if (toDate) query = query.lte("sale_date", toDate);

  const { data, error } = await query.limit(500);
  if (error) throw error;
  return data ?? [];
}

// ── 입고 기록 조회 ─────────────────────────────────────────────
export async function getStockIns(): Promise<StockInRecord[]> {
  const { data, error } = await getClient()
    .from("heartain_stock_in")
    .select("*, product:heartain_products(name)")
    .order("stock_date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

// ── 네이버 매핑 전체 조회 ──────────────────────────────────────
export async function getNaverMappings(): Promise<NaverMapping[]> {
  const { data, error } = await getClient()
    .from("heartain_naver_mappings")
    .select("*");
  if (error) throw error;
  return data ?? [];
}

// ── 네이버 매핑 추가/수정 ─────────────────────────────────────
export async function upsertNaverMapping(
  productId: number,
  naverProductName: string,
  naverOptionName?: string
) {
  const { error } = await getClient()
    .from("heartain_naver_mappings")
    .upsert({
      product_id: productId,
      naver_product_name: naverProductName,
      naver_option_name: naverOptionName ?? null,
    });
  if (error) throw error;
}

// ── 동기화 로그 기록 ───────────────────────────────────────────
export async function writeSyncLog(
  ordersFetched: number,
  ordersProcessed: number,
  errorMessage?: string
) {
  await getClient().from("heartain_sync_log").insert({
    orders_fetched: ordersFetched,
    orders_processed: ordersProcessed,
    error_message: errorMessage ?? null,
  });
}

export async function getLastSyncLog() {
  const { data } = await getClient()
    .from("heartain_sync_log")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

// ── 발주 관련 ─────────────────────────────────────────────────
export interface PurchaseOrder {
  id: number;
  product_id: number;
  quantity: number;
  order_date: string;
  expected_arrival: string;
  note: string | null;
  status: "ordered" | "arrived" | "cancelled";
  arrived_date: string | null;
  created_at: string;
  product?: { name: string };
}

export async function getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  let query = getClient()
    .from("heartain_purchase_orders")
    .select("*, product:heartain_products(name)")
    .order("expected_arrival");
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function addPurchaseOrder(
  productId: number,
  quantity: number,
  orderDate: string,
  note?: string
) {
  const arrival = new Date(orderDate);
  arrival.setDate(arrival.getDate() + 40);
  const expectedArrival = arrival.toISOString().split("T")[0];

  const { error } = await getClient().from("heartain_purchase_orders").insert({
    product_id: productId,
    quantity,
    order_date: orderDate,
    expected_arrival: expectedArrival,
    note: note ?? null,
    status: "ordered",
  });
  if (error) throw error;
}

export async function markPurchaseOrderArrived(id: number, arrivedDate: string) {
  const sb = getClient();
  const { data: po, error: fetchErr } = await sb
    .from("heartain_purchase_orders")
    .select("product_id, quantity")
    .eq("id", id)
    .single();
  if (fetchErr || !po) throw new Error("발주 내역을 찾을 수 없습니다.");

  await sb.from("heartain_purchase_orders").update({
    status: "arrived",
    arrived_date: arrivedDate,
  }).eq("id", id);

  // 재고 증가
  await addStockIn(po.product_id, po.quantity, arrivedDate, `발주 입고 (발주ID: ${id})`);
}

// ── 대시보드 요약 통계 ─────────────────────────────────────────
export async function getDashboardStats() {
  const sb = getClient();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const [inventory, todaySales, monthSales] = await Promise.all([
    sb.from("heartain_inventory").select("quantity"),
    sb
      .from("heartain_sales")
      .select("quantity, coupon_discount, product:heartain_products(selling_price)")
      .eq("sale_date", today),
    sb
      .from("heartain_sales")
      .select("quantity, coupon_discount, product:heartain_products(selling_price, margin)")
      .gte("sale_date", monthStart),
  ]);

  const totalStock = (inventory.data ?? []).reduce((s, r) => s + r.quantity, 0);
  const todayRevenue = (todaySales.data ?? []).reduce(
    (s: number, r: any) => s + r.quantity * (r.product?.selling_price ?? 0) - (r.coupon_discount ?? 0),
    0
  );
  const monthRevenue = (monthSales.data ?? []).reduce(
    (s: number, r: any) => s + r.quantity * (r.product?.selling_price ?? 0) - (r.coupon_discount ?? 0),
    0
  );
  const monthProfit = (monthSales.data ?? []).reduce(
    (s: number, r: any) => s + r.quantity * (r.product?.margin ?? 0) - (r.coupon_discount ?? 0),
    0
  );

  return { totalStock, todayRevenue, monthRevenue, monthProfit };
}

// ── 날짜 범위 판매 집계 (실제 매출 분석용) ────────────────────────
export async function getSalesByDateRange(fromDate: string, toDate: string) {
  const { data, error } = await getClient()
    .from("heartain_sales")
    .select("sale_date, quantity, coupon_discount, product:heartain_products(name, selling_price, margin, cost_krw)")
    .gte("sale_date", fromDate)
    .lte("sale_date", toDate)
    .order("sale_date");
  if (error) throw error;
  return data ?? [];
}

// ── 월별 제품 판매 집계 ────────────────────────────────────────
export async function getMonthlySalesByProduct(months = 6) {
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - months);
  const from = fromDate.toISOString().split("T")[0];

  const { data, error } = await getClient()
    .from("heartain_sales")
    .select("sale_date, quantity, coupon_discount, product:heartain_products(name, selling_price, margin)")
    .gte("sale_date", from)
    .order("sale_date");
  if (error) throw error;
  return data ?? [];
}

// ── 월별 쿠폰 사용 집계 ───────────────────────────────────────
export async function getMonthlyCouponStats(months = 6) {
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - months);
  const from = fromDate.toISOString().split("T")[0];

  const { data, error } = await getClient()
    .from("heartain_sales")
    .select("sale_date, coupon_discount")
    .gte("sale_date", from)
    .gt("coupon_discount", 0)
    .order("sale_date");
  if (error) throw error;

  // 월별 집계
  const monthly: Record<string, { total: number; count: number }> = {};
  for (const row of data ?? []) {
    const month = (row.sale_date as string).slice(0, 7);
    if (!monthly[month]) monthly[month] = { total: 0, count: 0 };
    monthly[month].total += row.coupon_discount as number;
    monthly[month].count += 1;
  }
  return monthly;
}
