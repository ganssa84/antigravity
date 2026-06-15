import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('nocut7_rankings')
    .select('name, time')
    .order('time', { ascending: true })
    .limit(20);

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').slice(0, 10).trim();
  const time = Number(body.time);

  if (!name || isNaN(time) || time <= 0) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  await supabase.from('nocut7_rankings').insert({ name, time });

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
