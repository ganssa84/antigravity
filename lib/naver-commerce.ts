import bcrypt from "bcryptjs";

const BASE_URL = "https://api.commerce.naver.com/external";

export interface NaverOrder {
  productOrderId: string;
  orderId: string;
  orderDate: string;
  productName: string;
  productOption: string;
  quantity: number;
  status: string;
  couponDiscount: number;  // 실제 사용된 쿠폰 할인 합계 (원)
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID;
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_COMMERCE_CLIENT_ID 또는 NAVER_COMMERCE_CLIENT_SECRET 환경변수가 없습니다.");
  }

  // 네이버 커머스 API: Base64(bcrypt(clientId_timestamp, clientSecret))
  const timestamp = Date.now();
  const bcryptHash = await bcrypt.hash(`${clientId}_${timestamp}`, clientSecret);
  const clientSecretSign = Buffer.from(bcryptHash).toString("base64");

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      timestamp: String(timestamp),
      client_secret_sign: clientSecretSign,
      grant_type: "client_credentials",
      type: "SELF",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`네이버 토큰 발급 실패: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.access_token as string;
}

// 하루치 주문 조회 (Naver API는 최대 24시간 범위만 허용)
async function fetchDayOrders(token: string, from: Date, to: Date): Promise<NaverOrder[]> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    pageNum: "1",
    pageSize: "300",
  });

  const res = await fetch(`${BASE_URL}/v1/pay-order/seller/product-orders?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];

  const json = await res.json();
  const contents: any[] = json.data?.contents ?? [];

  return contents.map((item) => {
    const order = item.content?.order ?? {};
    const po = item.content?.productOrder ?? {};
    const couponDiscount = (po.appliedCoupons ?? []).reduce(
      (sum: number, c: any) => sum + (c.couponDiscountAmount ?? 0),
      0
    );
    return {
      productOrderId: po.productOrderId ?? item.productOrderId ?? "",
      orderId: order.orderId ?? "",
      orderDate: (order.orderDate ?? "").slice(0, 10),
      productName: po.productName ?? "",
      productOption: po.productOption ?? "",
      quantity: po.quantity ?? 1,
      status: po.productOrderStatus ?? "",
      couponDiscount,
    };
  });
}

// 기간 내 결제완료/배송완료/구매확정 주문 조회 (날짜별로 분할 요청)
export async function fetchDeliveredOrders(fromDate: string, toDate: string): Promise<NaverOrder[]> {
  const token = await getAccessToken();
  const allOrders: NaverOrder[] = [];

  const deliveredStatuses = new Set(["DELIVERED", "PURCHASE_DECIDED", "PAYED"]);

  let cursor = new Date(fromDate);
  const end = new Date(toDate);

  while (cursor < end) {
    const dayEnd = new Date(cursor);
    dayEnd.setDate(dayEnd.getDate() + 1);
    if (dayEnd > end) dayEnd.setTime(end.getTime());

    const dayOrders = await fetchDayOrders(token, cursor, dayEnd);
    for (const o of dayOrders) {
      if (deliveredStatuses.has(o.status)) {
        allOrders.push(o);
      }
    }

    cursor = dayEnd;
    // rate limit 방지
    await new Promise((r) => setTimeout(r, 300));
  }

  return allOrders;
}
