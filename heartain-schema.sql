-- 하틴 (heartain) 재고 관리 시스템 스키마
-- Supabase SQL Editor에서 실행하세요

-- 제품 마스터
CREATE TABLE IF NOT EXISTS heartain_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  cost_usd DECIMAL(10,2),
  cost_krw INTEGER,
  selling_price INTEGER,
  shipping_cost INTEGER DEFAULT 126,
  margin INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 재고 현황 (제품당 1행)
CREATE TABLE IF NOT EXISTS heartain_inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES heartain_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

-- 일별 판매 기록
CREATE TABLE IF NOT EXISTS heartain_sales (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES heartain_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sale_date DATE NOT NULL,
  note TEXT,
  naver_order_id TEXT UNIQUE,  -- 네이버 주문번호 (중복 방지)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 입고 기록
CREATE TABLE IF NOT EXISTS heartain_stock_in (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES heartain_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  stock_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 네이버 스마트스토어 상품명 ↔ heartain 제품 매핑
CREATE TABLE IF NOT EXISTS heartain_naver_mappings (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES heartain_products(id) ON DELETE CASCADE,
  naver_product_name TEXT NOT NULL,  -- 네이버에 등록된 정확한 상품명
  naver_option_name TEXT,            -- 옵션명이 있으면 (e.g. "거북이")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(naver_product_name, naver_option_name)
);

-- 네이버 동기화 로그
CREATE TABLE IF NOT EXISTS heartain_sync_log (
  id SERIAL PRIMARY KEY,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  orders_fetched INTEGER DEFAULT 0,
  orders_processed INTEGER DEFAULT 0,
  error_message TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_heartain_sales_date ON heartain_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_heartain_sales_product ON heartain_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_heartain_sales_naver_order ON heartain_sales(naver_order_id);
CREATE INDEX IF NOT EXISTS idx_heartain_stock_in_date ON heartain_stock_in(stock_date);

-- ============================================================
-- 초기 제품 데이터
-- ============================================================
INSERT INTO heartain_products (name, cost_usd, cost_krw, selling_price, shipping_cost, margin, sort_order) VALUES
  ('거북이',       1.30, 1950, 12900, 126, 10824,  1),
  ('브로콜리',     0.95, 1425, 12900, 126, 11349,  2),
  ('아보카도',     0.95, 1425, 12900, 126, 11349,  3),
  ('병아리',       0.95, 1425, 12900, 126, 11349,  4),
  ('카피바라',     1.46, 2190, 12900, 126, 10584,  5),
  ('포테이토 보이', 0.63,  945, 11900, 126, 10829,  6),
  ('오리',         1.36, 2040, 12900, 126, 10734,  7),
  ('펭귄 블랙',    1.06, 1590, 12900, 126, 11184,  8),
  ('나무늘보',     1.12, 1680, 12900, 126, 11094,  9),
  ('꿀벌 보이',    1.50, 2250, 12900, 126, 10524, 10),
  ('포테이토 산타', 0.98, 1470, 13900, 126, 12304, 11),
  ('펭귄 그레이',  0.96, 1440, 12900, 126, 11334, 12),
  ('포테이토 걸',  0.94, 1410, 12900, 126, 11364, 13),
  ('해바라기',     1.67, 2505, 13900, 126, 11269, 14),
  ('다이노',       1.24, 1860, 12900, 126, 10914, 15),
  ('오이 보이',    0.84, 1260, 12900, 126, 11514, 16),
  ('피그',         1.54, 2310, 12900, 126, 10464, 17),
  ('오이걸',       0.90, 1350, 12900, 126, 11424, 18),
  ('비버보이',     1.27, 1905, 12900, 126, 10869, 19),
  ('선인장',       2.10, 3150, 14900, 126, 11624, 20),
  ('꿀벌 걸',      1.73, 2595, 13900, 126, 11179, 21),
  ('펌킨 할로윈',  1.80, 2700, 13900, 126, 11074, 22),
  ('키체인',       0.08,  120,  1000,   0,   880, 23),
  ('루돌프',       1.48, 2220, 12900, 126, 10554, 30),
  ('눈사람',       2.46, 3690, 12900, 126,  9084, 31),
  ('곰카드',       1.88, 2820, 12900, 126,  9954, 32),
  ('꽃카드',       0.88, 1320, 12900, 126, 11454, 33),
  ('풍선카드',     0.95, 1425, 12900, 126, 11349, 34),
  ('우파루파',     1.02, 1530, 12900, 126, 11244, 35),
  ('소',           1.56, 2340, 12900, 126, 10434, 36),
  ('호랑이',       1.38, 2070, 12900, 126, 10704, 37),
  ('비버걸',       1.27, 1905, 12900, 126, 10869, 38),
  ('펭귄',         1.32, 1980, 12900, 126, 10794, 39),
  ('코알라',       1.88, 2820, 12900, 126,  9954, 40),
  ('레몬',         1.29, 1935, 12900, 126, 10839, 41),
  ('하트선인장',   2.19, 3285, 14900, 126, 11489, 42),
  ('햄스터',       1.74, 2610, 12900, 126, 10164, 43),
  ('고양이',       2.29, 3435, 12900, 126,  9339, 44),
  ('테니스공',     1.84, 2760, 12900, 126, 10014, 45),
  ('호박',         2.02, 3030, 13900, 126, 10744, 46),
  ('개',           2.52, 3780, 12900, 126,  8994, 47),
  ('토끼',         1.58, 2370, 12900, 126, 10404, 48)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 현재 재고 (2026-06-07 기준)
-- ============================================================
INSERT INTO heartain_inventory (product_id, quantity)
SELECT p.id, v.qty
FROM heartain_products p
JOIN (VALUES
  ('거북이',       185),
  ('브로콜리',      88),
  ('아보카도',      40),
  ('병아리',        86),
  ('카피바라',     159),
  ('포테이토 보이',  79),
  ('오리',          32),
  ('펭귄 블랙',    189),
  ('나무늘보',      84),
  ('꿀벌 보이',     40),
  ('포테이토 산타',  90),
  ('펭귄 그레이',   28),
  ('포테이토 걸',   39),
  ('해바라기',      36),
  ('다이노',        40),
  ('오이 보이',     40),
  ('피그',          40),
  ('오이걸',        40),
  ('비버보이',      24),
  ('선인장',        39),
  ('꿀벌 걸',       35),
  ('펌킨 할로윈',   90),
  ('키체인',       990),
  ('루돌프',        12),
  ('눈사람',        52),
  ('곰카드',        53),
  ('꽃카드',        67),
  ('풍선카드',      80),
  ('우파루파',      96),
  ('소',           129),
  ('비버걸',       131),
  ('펭귄',         132),
  ('코알라',       133),
  ('레몬',         135),
  ('하트선인장',   137),
  ('햄스터',       209),
  ('고양이',       210),
  ('테니스공',     212),
  ('호박',         238),
  ('개',           239),
  ('토끼',         255)
) AS v(name, qty) ON p.name = v.name
ON CONFLICT (product_id) DO UPDATE
  SET quantity = EXCLUDED.quantity, updated_at = NOW();

-- ============================================================
-- 네이버 상품명 매핑 (스마트스토어 상품 옵션명에 맞게 수정 필요)
-- 네이버에서 실제 사용하는 옵션명으로 업데이트하세요
-- ============================================================
INSERT INTO heartain_naver_mappings (product_id, naver_product_name, naver_option_name)
SELECT p.id, '하틴 메시지 크로셰 인형', p.name
FROM heartain_products p
WHERE p.sort_order <= 23
ON CONFLICT DO NOTHING;
