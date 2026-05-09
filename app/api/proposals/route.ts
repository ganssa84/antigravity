import { NextResponse } from "next/server";
import { getProposals } from "@/lib/supabase";

export async function GET() {
  try {
    const proposals = await getProposals();
    return NextResponse.json({ proposals });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
