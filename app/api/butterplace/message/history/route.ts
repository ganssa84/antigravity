import { NextRequest, NextResponse } from "next/server";
import { getMessageLogs } from "@/lib/butterplace-db";

export async function GET(req: NextRequest) {
  if (req.cookies.get("bp_admin")?.value !== "authenticated") {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }
  try {
    const logs = await getMessageLogs();
    return NextResponse.json({ logs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
