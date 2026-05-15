import { NextRequest, NextResponse } from "next/server";
import { markAttendance, updateKakaoSent, getAllAttendanceByMonth } from "@/lib/butterplace-db";
import { sendSMS, buildAttendanceMessage, buildLastSessionMessage } from "@/lib/solapi";

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get("bp_admin")?.value === "authenticated";
}

export async function POST(req: NextRequest) {
  try {
    const { student_id, is_makeup = false } = await req.json();

    if (!student_id) {
      return NextResponse.json({ error: "student_id가 필요합니다." }, { status: 400 });
    }

    if (is_makeup && !isAdmin(req)) {
      return NextResponse.json({ error: "보강 입력은 관리자만 가능합니다." }, { status: 401 });
    }

    const result = await markAttendance(student_id, is_makeup);
    const { attendance, student, isLastSession, sessionNumber, totalSessions } = result;

    const text = isLastSession
      ? buildLastSessionMessage(student.name, totalSessions)
      : buildAttendanceMessage(student.name, sessionNumber, totalSessions);

    try {
      await sendSMS(student.parent_phone, text);
      await updateKakaoSent(attendance.id);
    } catch (e) {
      console.error("[솔라피] 발송 실패:", e);
    }

    return NextResponse.json({
      success: true,
      studentName: student.name,
      sessionNumber,
      totalSessions,
      isLastSession,
      message: text,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "출석 처리 오류";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const sp = new URL(req.url).searchParams;
    const year  = parseInt(sp.get("year")  ?? String(new Date().getFullYear()));
    const month = parseInt(sp.get("month") ?? String(new Date().getMonth() + 1));
    const records = await getAllAttendanceByMonth(year, month);
    return NextResponse.json({ records });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
