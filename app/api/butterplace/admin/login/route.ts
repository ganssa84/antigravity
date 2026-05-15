import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPw = process.env.BUTTERPLACE_ADMIN_PASSWORD;

    if (!adminPw) {
      return NextResponse.json({ error: "서버에 관리자 비밀번호가 설정되지 않았습니다." }, { status: 500 });
    }

    if (password !== adminPw) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set("bp_admin", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax",
    });

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
