import { NextRequest, NextResponse } from "next/server";
import { markAttendance, updateKakaoSent, getAllAttendanceByMonth, logMessage } from "@/lib/butterplace-db";
import {
  sendSMS,
  buildAttendanceMessage,
  buildLastSessionMessage,
  buildNoShowMessage,
} from "@/lib/solapi";

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get("bp_admin")?.value === "authenticated";
}

// date: "YYYY-MM-DD" → "M월 D일(요일)" / 미입력 시 오늘 KST 날짜
function makeDateLabel(date?: string): string {
  const weeks = ["일", "월", "화", "수", "목", "금", "토"];
  if (date) {
    const [y, m, d] = date.split("-").map(Number);
    return `${m}월 ${d}일(${weeks[new Date(y, m - 1, d).getDay()]})`;
  }
  // 서버(UTC)에서 KST(+9) 오늘 날짜 계산
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  return `${m}월 ${d}일(${weeks[kst.getUTCDay()]})`;
}

// date: "YYYY-MM-DD" → Supabase에 저장할 ISO 타임스탬프 (한국 정오 기준)
function makeAttendedAt(date?: string): string | undefined {
  if (!date) return undefined;
  return `${date}T12:00:00+09:00`;
}

export async function POST(req: NextRequest) {
  try {
    const { student_id, is_makeup = false, is_noshow = false, is_double = false, date } = await req.json();

    if (!student_id) {
      return NextResponse.json({ error: "student_id가 필요합니다." }, { status: 400 });
    }

    if ((is_makeup || is_noshow || is_double) && !isAdmin(req)) {
      return NextResponse.json({ error: "관리자만 가능합니다." }, { status: 401 });
    }

    // ── 당일 1회 추가 (이미 출석한 날 1회 더) ──
    if (is_double) {
      const result = await markAttendance(student_id, true);
      const { attendance, student, isLastSession, sessionNumber, totalSessions } = result;

      const todayLabel = makeDateLabel();
      const text = isLastSession
        ? buildLastSessionMessage(student.name, totalSessions, todayLabel)
        : buildAttendanceMessage(student.name, sessionNumber, totalSessions, todayLabel);

      let smsSent = false;
      try {
        await sendSMS(student.parent_phone, text);
        await updateKakaoSent(attendance.id);
        smsSent = true;
      } catch (e) {
        console.error("[솔라피] 당일추가 발송 실패:", e);
      }
      await logMessage({
        recipient: student.name,
        phone: student.parent_phone,
        message: text,
        type: "attendance",
        success: smsSent,
      });

      return NextResponse.json({
        success: true,
        studentName: student.name,
        sessionNumber,
        totalSessions,
        isLastSession,
        message: text,
      });
    }

    // ── 일반 출석 / 보강 / 결석 차감 ──
    const attendedAt = makeAttendedAt(date);
    const result = await markAttendance(student_id, is_makeup, is_noshow, attendedAt);
    const { attendance, student, isLastSession, sessionNumber, totalSessions } = result;

    const dateLabel = makeDateLabel(date);
    let text: string;
    if (is_noshow) {
      text = buildNoShowMessage(student.name, sessionNumber, totalSessions, dateLabel);
    } else if (isLastSession) {
      text = buildLastSessionMessage(student.name, totalSessions, dateLabel);
    } else {
      text = buildAttendanceMessage(student.name, sessionNumber, totalSessions, dateLabel);
    }

    let smsSent = false;
    try {
      await sendSMS(student.parent_phone, text);
      await updateKakaoSent(attendance.id);
      smsSent = true;
    } catch (e) {
      console.error("[솔라피] 발송 실패:", e);
    }
    await logMessage({
      recipient: student.name,
      phone: student.parent_phone,
      message: text,
      type: "attendance",
      success: smsSent,
    });

    return NextResponse.json({
      success: true,
      studentName: student.name,
      sessionNumber,
      totalSessions,
      isLastSession,
      isNoShow: is_noshow,
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
