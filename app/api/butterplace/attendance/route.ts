import { NextRequest, NextResponse } from "next/server";
import { markAttendance, updateKakaoSent, getAllAttendanceByMonth } from "@/lib/butterplace-db";
import { sendSMS, buildAttendanceMessage, buildLastSessionMessage } from "@/lib/solapi";
import { cookies } from "next/headers";

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("bp_admin")?.value === "authenticated";
}

// POST /api/butterplace/attendance
// body: { student_id, is_makeup? }
export async function POST(req: NextRequest) {
  const { student_id, is_makeup = false } = await req.json();

  if (!student_id) {
    return NextResponse.json({ error: "student_id가 필요합니다." }, { status: 400 });
  }

  // 보강은 관리자만
  if (is_makeup && !(await isAdmin())) {
    return NextResponse.json({ error: "보강 입력은 관리자만 가능합니다." }, { status: 401 });
  }

  let result;
  try {
    result = await markAttendance(student_id, is_makeup);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "출석 처리 오류";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { attendance, student, isLastSession, sessionNumber, totalSessions } = result;

  // 카카오/SMS 발송
  const text = isLastSession
    ? buildLastSessionMessage(student.name, totalSessions)
    : buildAttendanceMessage(student.name, sessionNumber, totalSessions);

  try {
    await sendSMS(student.parent_phone, text);
    await updateKakaoSent(attendance.id);
  } catch (e) {
    // 발송 실패는 로그만 남기고 출석은 유효 처리
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
}

// GET /api/butterplace/attendance?year=2025&month=5  — 월별 기록 (관리자)
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const year  = parseInt(sp.get("year")  ?? String(new Date().getFullYear()));
  const month = parseInt(sp.get("month") ?? String(new Date().getMonth() + 1));

  const records = await getAllAttendanceByMonth(year, month);
  return NextResponse.json({ records });
}
