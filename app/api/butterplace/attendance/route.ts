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

function makeDateLabel(attendedAt?: string): string {
  if (!attendedAt) return "오늘";
  // UTC → KST(+9) 변환 후 "M월 D일(요일)" 형식으로 반환
  const kst = new Date(new Date(attendedAt).getTime() + 9 * 60 * 60 * 1000);
  const month = kst.getUTCMonth() + 1;
  const day   = kst.getUTCDate();
  const week  = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  return `${month}월 ${day}일(${week})`;
}

export async function POST(req: NextRequest) {
  try {
    const { student_id, is_makeup = false, is_noshow = false, is_double = false, attended_at } = await req.json();

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

      const text = isLastSession
        ? buildLastSessionMessage(student.name, totalSessions)
        : buildAttendanceMessage(student.name, sessionNumber, totalSessions);
      // 당일1회추가는 항상 오늘 날짜이므로 dateLabel 불필요

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
    const result = await markAttendance(student_id, is_makeup, is_noshow, attended_at);
    const { attendance, student, isLastSession, sessionNumber, totalSessions } = result;

    const dateLabel = makeDateLabel(attended_at);
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
