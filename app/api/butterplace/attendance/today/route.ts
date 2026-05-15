import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTodayAttendance } from "@/lib/butterplace-db";

export async function GET() {
  const store = await cookies();
  if (store.get("bp_admin")?.value !== "authenticated") {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const records = await getTodayAttendance();
  return NextResponse.json({ records });
}
