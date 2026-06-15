/**
 * 노컷7 랭킹 테이블 자동 생성 스크립트
 * 실행: node scripts/nocut7-setup.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// .env.local 파싱
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return env;
}

const env = loadEnv();
const URL  = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVCR = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON) {
  console.error('❌ .env.local에 NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다.');
  process.exit(1);
}

if (!SVCR) {
  const projectRef = URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '';
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  console.log('');
  console.log('  👉 아래 2가지 방법 중 하나를 선택하세요:');
  console.log('');
  console.log('  [방법 1] SQL Editor에서 직접 실행 (30초)');
  console.log(`  → ${projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : 'Supabase 대시보드 > SQL Editor'}`);
  console.log('');
  console.log('  아래 SQL을 붙여넣고 실행 ▼');
  console.log('');
  console.log(`CREATE TABLE IF NOT EXISTS nocut7_rankings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  time float8 NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE nocut7_rankings DISABLE ROW LEVEL SECURITY;`);
  console.log('');
  console.log('  [방법 2] Service Role Key 추가 후 재실행');
  console.log('  → Supabase 대시보드 > Project Settings > API > service_role');
  console.log('  → .env.local 에 아래 줄 추가:');
  console.log('     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  process.exit(0);
}

// Service Role Key로 테이블 생성
const admin = createClient(URL, SVCR, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔧 nocut7_rankings 테이블 생성 중...');

// 1. 테이블 존재 여부 확인
const { error: checkErr } = await admin
  .from('nocut7_rankings')
  .select('id')
  .limit(1);

if (!checkErr) {
  console.log('✅ 테이블이 이미 존재합니다!');
  process.exit(0);
}

// 2. Management API로 SQL 실행
const projectRef = URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const mgmtRes = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SVCR}`,
    },
    body: JSON.stringify({
      query: `
        CREATE TABLE IF NOT EXISTS nocut7_rankings (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          name text NOT NULL,
          time float8 NOT NULL,
          created_at timestamptz DEFAULT now()
        );
        ALTER TABLE nocut7_rankings DISABLE ROW LEVEL SECURITY;
      `
    })
  }
);

if (mgmtRes.ok) {
  console.log('✅ 테이블 생성 완료! 실시간 랭킹이 활성화됩니다.');
} else {
  const body = await mgmtRes.json().catch(() => ({}));
  console.log('⚠️  자동 생성 실패. 아래 SQL을 Supabase SQL Editor에서 수동 실행하세요:');
  console.log('');
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('');
  console.log(`CREATE TABLE IF NOT EXISTS nocut7_rankings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  time float8 NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE nocut7_rankings DISABLE ROW LEVEL SECURITY;`);
}
