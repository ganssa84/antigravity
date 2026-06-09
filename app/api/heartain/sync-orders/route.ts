import { NextResponse } from "next/server";
import { fetchDeliveredOrders } from "@/lib/naver-commerce";
import {
  getNaverMappings,
  addSale,
  writeSyncLog,
} from "@/lib/heartain-db";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // 기본: 최근 7일치 동기화
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (body.days ?? 7));

    const from = fromDate.toISOString().slice(0, 19);
    const to = toDate.toISOString().slice(0, 19);

    // 네이버에서 배송완료/구매확정 주문 가져오기
    const orders = await fetchDeliveredOrders(from, to);

    // 이미 처리된 주문번호 확인 (중복 방지)
    const { data: existingOrders } = await getClient()
      .from("heartain_sales")
      .select("naver_order_id")
      .not("naver_order_id", "is", null);

    const processedIds = new Set(
      (existingOrders ?? []).map((r: any) => r.naver_order_id)
    );

    // 매핑 테이블 로드
    const mappings = await getNaverMappings();

    let processed = 0;
    const errors: string[] = [];

    for (const order of orders) {
      // 이미 처리된 주문 스킵
      if (processedIds.has(order.productOrderId)) continue;

      // 제품 매핑 찾기 (옵션명 우선, 없으면 상품명으로 매칭)
      const mapping = mappings.find(
        (m) =>
          m.naver_option_name
            ? order.productName.includes(m.naver_product_name) &&
              order.productOption?.includes(m.naver_option_name)
            : order.productName === m.naver_product_name
      );

      if (!mapping) {
        errors.push(
          `매핑 없음: ${order.productName} / 옵션: ${order.productOption ?? "-"}`
        );
        continue;
      }

      try {
        await addSale(
          mapping.product_id,
          order.quantity,
          order.orderDate,
          `네이버 주문 #${order.orderId}`,
          order.productOrderId,
          order.couponDiscount
        );
        processed++;
      } catch (e: any) {
        errors.push(`처리 실패 [${order.productOrderId}]: ${e.message}`);
      }
    }

    await writeSyncLog(orders.length, processed, errors.length > 0 ? errors.join("; ") : undefined);

    return NextResponse.json({
      ok: true,
      fetched: orders.length,
      processed,
      skipped: orders.length - processed - errors.length,
      errors,
    });
  } catch (e: any) {
    await writeSyncLog(0, 0, e.message).catch(() => {});
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// 마지막 동기화 상태 조회
export async function GET() {
  const { data } = await getClient()
    .from("heartain_sync_log")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(5);
  return NextResponse.json(data ?? []);
}
