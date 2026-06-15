import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS nocut7_rankings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    time float8 NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE nocut7_rankings ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nocut7_rankings' AND policyname='public read') THEN
      CREATE POLICY "public read" ON nocut7_rankings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nocut7_rankings' AND policyname='public insert') THEN
      CREATE POLICY "public insert" ON nocut7_rankings FOR INSERT WITH CHECK (true);
    END IF;
  END $$;
`;

async function ensureTable() {
  // rpc 방식으로 테이블 자동 생성 시도 (service role 없으면 무시)
  await supabase.rpc('exec_ddl', { sql: CREATE_SQL }).catch(() => null);
}

export async function GET() {
  const { data, error } = await supabase
    .from('nocut7_rankings')
    .select('name, time')
    .order('time', { ascending: true })
    .limit(20);

  if (error) {
    // 테이블 없음 → 클라이언트가 localStorage 폴백 사용
    return NextResponse.json(null, { status: 503 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').slice(0, 10).trim();
  const time = Number(body.time);

  if (!name || isNaN(time) || time <= 0) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const { error: insertErr } = await supabase
    .from('nocut7_rankings')
    .insert({ name, time });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 503 });
  }

  const { count } = await supabase
    .from('nocut7_rankings')
    .select('*', { count: 'exact', head: true })
    .lt('time', time);

  const { count: total } = await supabase
    .from('nocut7_rankings')
    .select('*', { count: 'exact', head: true });

  const rank = (count ?? 0) + 1;

  return NextResponse.json({ rank, total: total ?? 0 });
}
