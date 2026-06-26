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

  if (error) {
    return NextResponse.json({ _error: 'db_unavailable' }, { status: 503 });
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

  const [{ count: faster }, { count: total }] = await Promise.all([
    supabase.from('nocut7_rankings').select('*', { count: 'exact', head: true }).lt('time', time),
    supabase.from('nocut7_rankings').select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({ rank: (faster ?? 0) + 1, total: total ?? 0 });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.password !== '1234') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { error } = await supabase
    .from('nocut7_rankings')
    .delete()
    .gte('time', 0);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
