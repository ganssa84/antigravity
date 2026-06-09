/**
 * 누락된 네이버 매핑 일괄 추가
 * node scripts/add-missing-mappings.mjs
 */

const SUPABASE_URL = 'https://twzusbjcfmdgxpnnwzve.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3enVzYmpjZm1kZ3hwbm53enZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjk4MDEsImV4cCI6MjA5Mzg0NTgwMX0.xO4TwDjr_X_TFPfhKDQH7zxhZTdlOQ1T-oLoEqgw0V8';

async function sb(path, options = {}) {
  const res = await fetch(SUPABASE_URL + path, {
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

// 현재 매핑 조회
const { data: existing } = await sb('/rest/v1/heartain_naver_mappings?select=naver_product_name,naver_option_name');
const existingSet = new Set(
  (existing ?? []).map(m => `${m.naver_product_name}|||${m.naver_option_name ?? ''}`)
);

// ── 옵션 없는 단일 제품 매핑 ──────────────────────────────────────
const singleMappings = [
  // 새로운 상품명으로 등록된 단일 제품들
  { product_id: 1,  naver_product_name: '하틴 크로셰 거북이 인형 키링 선물 레터링 카드', naver_option_name: null },
  { product_id: 2,  naver_product_name: '하틴 크로셰 브로콜리 인형 생일 축하 이벤트 레터링 카드', naver_option_name: null },
  { product_id: 3,  naver_product_name: '하틴 크로셰 아보카도 인형 부모님 환갑 선물 케이크 토퍼', naver_option_name: null },
  { product_id: 4,  naver_product_name: '하틴 크로셰 병아리 인형 젠더리빌 이벤트 베라 케이크 토퍼', naver_option_name: null },
  { product_id: 5,  naver_product_name: '하틴 크로셰 카피바라 인형 생일 축하 이벤트 레터링 카드', naver_option_name: null },
  { product_id: 7,  naver_product_name: '하틴 크로셰 오리 인형 젠더리빌 이벤트 베라 케이크 토퍼 카드', naver_option_name: null },
  { product_id: 8,  naver_product_name: '하틴 크로셰 펭귄 블랙 인형 생일 축하 이벤트 레터링 카드', naver_option_name: null },
  { product_id: 9,  naver_product_name: '하틴 크로셰 나무늘보 인형 출산 축하 이벤트 레터링 카드', naver_option_name: null },
  { product_id: 10, naver_product_name: '하틴 크로셰 꿀벌 보이 인형 키링 선물 이벤트 레터링 카드', naver_option_name: null },
  { product_id: 12, naver_product_name: '하틴 크로셰 펭귄 그레이 인형 키링 선물 레터링 카드', naver_option_name: null },
  { product_id: 13, naver_product_name: '하틴 크로셰 포테이토 걸 인형 젠더리빌 이벤트 케이크 토퍼 카드', naver_option_name: null },
  { product_id: 14, naver_product_name: '하틴 크로셰 해바라기 인형 부모님 환갑 선물 케이크 토퍼 이벤트', naver_option_name: null },
  { product_id: 17, naver_product_name: '하틴 크로셰 피그 인형 키링 선물 이벤트 레터링 카드', naver_option_name: null },
  { product_id: 19, naver_product_name: '하틴 크로셰 비버 보이 인형 키링 선물 레터링 카드', naver_option_name: null },
  { product_id: 20, naver_product_name: '하틴 크로셰 선인장 인형 생일 축하 이벤트 레터링 카드', naver_option_name: null },
  { product_id: 21, naver_product_name: '하틴 크로셰 꿀벌 걸 인형 젠더리빌 이벤트 케이크 토퍼 카드', naver_option_name: null },
  { product_id: 23, naver_product_name: '하틴 크로셰 인형 호환 키링 키체인', naver_option_name: null },
  { product_id: 32, naver_product_name: '하틴 크로셰 비버 인형 키링 선물 레터링 카드', naver_option_name: null },
  { product_id: 36, naver_product_name: '하틴 어버이날 스승의날 선물 하트 선인장 인형 생일 카드', naver_option_name: null },
  { product_id: 36, naver_product_name: '하틴 어버이날 스승의날 선물 하트 선인장 인형 카드', naver_option_name: null },
];

// ── 베스트 9종 / 졸업식 9종 — 옵션별 매핑 ─────────────────────────
// 옵션명 → product_id
const OPTIONS = [
  { opt: '인형선택: 거북이',    pid: 1  },
  { opt: '인형선택: 터틀',      pid: 1  },
  { opt: '인형선택: 브로콜리',  pid: 2  },
  { opt: '인형선택: 아보카도',  pid: 3  },
  { opt: '인형선택: 병아리',    pid: 4  },
  { opt: '인형선택: 카피바라',  pid: 5  },
  { opt: '인형선택: 포테이토 보이', pid: 6 },
  { opt: '인형선택: 오리',      pid: 7  },
  { opt: '인형선택: 펭귄 블랙', pid: 8  },
  { opt: '인형선택: 나무늘보',  pid: 9  },
  { opt: '인형선택: 꿀벌 보이', pid: 10 },
  { opt: '인형선택: 포테이토 걸', pid: 13 },
  { opt: '인형선택: 해바라기',  pid: 14 },
  { opt: '인형선택: 비버 보이', pid: 19 },
  { opt: '인형선택: 비버',      pid: 19 },
  { opt: '인형선택: 선인장',    pid: 20 },
  { opt: '인형선택: 꿀벌 걸',   pid: 21 },
  { opt: '인형선택: 비버 걸',   pid: 32 },
  { opt: '인형선택: 펭귄',      pid: 33 },
  { opt: '인형선택: 펭귄 그레이', pid: 12 },
];

// 새로운 베스트 9종 상품명들
const BEST9_NAMES = [
  '하틴 생일 답례품 선물 축하 감사 인형 카드 베스트 9종',
  '하틴 생일 답례품 선물 축하 감사 인형 베스트 9종',
  '하틴 생일 결혼식 돌 답례품 축하 감사 인형 선물 베스트 9종',
  '하틴 졸업식 꽃다발 토퍼 학사모 축하 인형 선물 카드 9종',
  '하틴 졸업식 꽃다발 토퍼 학사모 축하 인형 선물 카드',
];

const optionMappings = [];
for (const name of BEST9_NAMES) {
  for (const { opt, pid } of OPTIONS) {
    optionMappings.push({ product_id: pid, naver_product_name: name, naver_option_name: opt });
  }
}

// ── 추가 대상 필터링 (이미 존재하는 것 제외) ─────────────────────
const all = [...singleMappings, ...optionMappings];
const toAdd = all.filter(m => {
  const key = `${m.naver_product_name}|||${m.naver_option_name ?? ''}`;
  return !existingSet.has(key);
});

console.log(`추가 대상: ${toAdd.length}개 (전체 ${all.length}개 중)`);

// ── Supabase에 삽입 ───────────────────────────────────────────────
let ok = 0, fail = 0;
for (const m of toAdd) {
  const { ok: success } = await sb('/rest/v1/heartain_naver_mappings', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(m),
  });
  if (success) { ok++; } else { fail++; console.log(`  ❌ 실패:`, m.naver_product_name, m.naver_option_name); }
}

console.log(`\n완료: ${ok}개 추가, ${fail}개 실패`);
