/**
 * 네이버 주문 동기화 로컬 스크립트
 * 집 컴퓨터(211.176.12.195)에서 실행: node scripts/naver-sync-local.mjs
 * Vercel IP 제한 우회용
 */

import https from 'https';
import bcrypt from 'bcryptjs';

const CLIENT_ID = '5j5VGATYLb5ywu4tUIeQjG';
const CLIENT_SECRET = '$2a$04$otLZX9Vc8.hY2JoWTGk7Te';
const SUPABASE_URL = 'https://twzusbjcfmdgxpnnwzve.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3enVzYmpjZm1kZ3hwbm53enZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjk4MDEsImV4cCI6MjA5Mzg0NTgwMX0.xO4TwDjr_X_TFPfhKDQH7zxhZTdlOQ1T-oLoEqgw0V8';
const DAYS = parseInt(process.argv[2] ?? '7');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function httpsReq(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sbFetch(path, options = {}) {
  const url = new URL(SUPABASE_URL + path);
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  try { return { ok: res.ok, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, data: text }; }
}

// ── 네이버 토큰 ──────────────────────────────────────────────
async function getToken() {
  const timestamp = Date.now();
  const bcryptHash = await bcrypt.hash(`${CLIENT_ID}_${timestamp}`, CLIENT_SECRET);
  const sign = Buffer.from(bcryptHash).toString('base64');
  const body = new URLSearchParams({
    client_id: CLIENT_ID, timestamp: String(timestamp),
    client_secret_sign: sign, grant_type: 'client_credentials', type: 'SELF',
  }).toString();
  const r = await httpsReq({
    hostname: 'api.commerce.naver.com', path: '/external/v1/oauth2/token',
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, body);
  if (!r.data.access_token) throw new Error(`토큰 발급 실패: ${JSON.stringify(r.data)}`);
  return r.data.access_token;
}

// ── 하루치 주문 조회 ──────────────────────────────────────────
async function fetchDayOrders(token, from, to) {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), pageNum: '1', pageSize: '300' });
  const r = await httpsReq({
    hostname: 'api.commerce.naver.com',
    path: `/external/v1/pay-order/seller/product-orders?${params}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status !== 200) return [];
  const contents = r.data?.data?.contents ?? [];
  return contents.map(item => {
    const order = item.content?.order ?? {};
    const po = item.content?.productOrder ?? {};
    return {
      productOrderId: po.productOrderId ?? '',
      orderId: order.orderId ?? '',
      orderDate: (order.orderDate ?? '').slice(0, 10),
      productName: (po.productName ?? '').normalize('NFC'),
      productOption: (po.productOption ?? '').normalize('NFC'),
      quantity: po.quantity ?? 1,
      status: po.productOrderStatus ?? '',
      couponDiscount: (po.appliedCoupons ?? []).reduce((s, c) => s + (c.couponDiscountAmount ?? 0), 0),
    };
  });
}

// ── 메인 ──────────────────────────────────────────────────────
console.log(`\n네이버 주문 동기화 (최근 ${DAYS}일)\n${'─'.repeat(40)}`);

const token = await getToken();
console.log('✅ 토큰 발급');

// 처리 대상 상태
const TARGET_STATUSES = new Set(['PAYED', 'DELIVERED', 'PURCHASE_DECIDED']);

// 기간별 주문 수집
const now = new Date();
const allOrders = [];
for (let d = 0; d < DAYS; d++) {
  await sleep(300);
  const to = new Date(now); to.setDate(to.getDate() - d);
  const from = new Date(to); from.setDate(from.getDate() - 1);
  const dayOrders = await fetchDayOrders(token, from, to);
  const filtered = dayOrders.filter(o => TARGET_STATUSES.has(o.status));
  if (filtered.length > 0) console.log(`  ${d}일전: ${filtered.length}건`);
  allOrders.push(...filtered);
}
console.log(`\n총 ${allOrders.length}건 대상 주문\n`);

// 이미 처리된 주문번호 조회
const { data: existing } = await sbFetch('/rest/v1/heartain_sales?select=naver_order_id&naver_order_id=not.is.null');
const processed = new Set((existing ?? []).map(r => r.naver_order_id));

// 네이버 매핑 조회
const { data: mappings } = await sbFetch('/rest/v1/heartain_naver_mappings?select=*');

// 재고 조회
const { data: inventory } = await sbFetch('/rest/v1/heartain_inventory?select=product_id,quantity');
const invMap = {};
for (const row of inventory ?? []) invMap[row.product_id] = row.quantity;

let syncCount = 0;
const errors = [];

for (const order of allOrders) {
  if (processed.has(order.productOrderId)) continue;

  // 매핑 찾기 (FFFD 치환 문자가 포함된 경우 와일드카드 매칭)
  function toMatchRegex(str) {
    const pattern = str.split('').map(c =>
      c === '�' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/, '\\$&')
    ).join('');
    return new RegExp(`^${pattern}$`);
  }
  const hasFFFD = order.productName.includes('�');
  const mapping = (mappings ?? []).find(m => {
    if (m.naver_option_name) {
      return order.productName.includes(m.naver_product_name) && order.productOption.includes(m.naver_option_name);
    }
    if (hasFFFD) return toMatchRegex(order.productName).test(m.naver_product_name);
    return order.productName === m.naver_product_name;
  });

  if (!mapping) {
    errors.push(`매핑 없음: "${order.productName.slice(0, 40)}"`);
    continue;
  }

  const pid = mapping.product_id;
  const qty = order.quantity;
  const curQty = invMap[pid] ?? 0;

  if (curQty < qty) {
    errors.push(`재고 부족: product_id=${pid} (현재 ${curQty}, 필요 ${qty})`);
    continue;
  }

  // 판매 기록 삽입
  const { ok: saleOk } = await sbFetch('/rest/v1/heartain_sales', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      product_id: pid, quantity: qty,
      sale_date: order.orderDate || new Date().toISOString().slice(0, 10),
      note: `네이버 주문 #${order.orderId}`,
      naver_order_id: order.productOrderId,
      coupon_discount: order.couponDiscount ?? 0,
    }),
  });

  if (!saleOk) { errors.push(`삽입 실패: ${order.productOrderId}`); continue; }

  // 재고 차감
  await sbFetch(`/rest/v1/heartain_inventory?product_id=eq.${pid}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ quantity: curQty - qty, updated_at: new Date().toISOString() }),
  });

  invMap[pid] = curQty - qty;
  syncCount++;
  console.log(`  ✅ ${order.productName.slice(0, 30)} x${qty} → product_id ${pid}`);

  // 키링 추가 옵션이면 키체인(23)도 별도 판매 기록
  const hasKeyring = order.productOption.includes('키링 추가');
  const krId = `${order.productOrderId}_kr`;
  if (hasKeyring && !processed.has(krId)) {
    const krQty = qty;
    const krCur = invMap[23] ?? 0;
    const { ok: krOk } = await sbFetch('/rest/v1/heartain_sales', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        product_id: 23, quantity: krQty,
        sale_date: order.orderDate || new Date().toISOString().slice(0, 10),
        note: `키링 추가 옵션 (네이버 주문 #${order.orderId})`,
        naver_order_id: krId,
        coupon_discount: 0,
      }),
    });
    if (krOk) {
      await sbFetch(`/rest/v1/heartain_inventory?product_id=eq.23`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ quantity: Math.max(0, krCur - krQty), updated_at: new Date().toISOString() }),
      });
      invMap[23] = Math.max(0, krCur - krQty);
      console.log(`     └─ 키링 추가 x${krQty} → product_id 23`);
    }
  }
}

// 동기화 로그 기록
await sbFetch('/rest/v1/heartain_sync_log', {
  method: 'POST',
  headers: { Prefer: 'return=minimal' },
  body: JSON.stringify({
    orders_fetched: allOrders.length, orders_processed: syncCount,
    error_message: errors.length > 0 ? errors.join('; ') : null,
  }),
});

console.log(`\n${'─'.repeat(40)}`);
console.log(`완료: ${syncCount}건 처리, ${errors.length}건 오류`);
if (errors.length > 0) {
  console.log('\n오류 목록:');
  errors.forEach(e => console.log(`  ❌ ${e}`));
}
