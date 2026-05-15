import { NextRequest, NextResponse } from "next/server";
import { cancelLastAttendance, logMessage } from "@/lib/butterplace-db";
import { sendSMS, buildCancelMessage } from "@/lib/solapi";

function makeDateLabel(isoString: string): string {
  const kst  = new Date(new Date(isoString).getTime() + 9 * 60 * 60 * 1000);
  const m    = kst.getUTCMonth() + 1;
  const d    = kst.getUTCDate();
  const week = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  return `${m}월 ${d}일(${week})`;
}

export async function POST(req: NextRequest) {
  if (req.cookies.get("bp_admin")?.value !== "authenticated") {
    return NextResponse.json({ error: "관리자만 가능합니다." }, { status: 401 });
  }

  try {
    const { student_id } = await req.json();
    if (!student_id) {
      return NextResponse.json({ error: "student_id가 필요합니다." }, { status: 400 });
    }

    const { student, canceledSession, totalSessions, attendedAt } = await cancelLastAttendance(student_id);

    const dateLabel  = makeDateLabel(attendedAt);
    const prevSession = canceledSession - 1;
    const text = buildCancelMessage(student.name, prevSession, totalSessions, dateLabel);

    let smsSent = false;
    try {
      await sendSMS(student.parent_phone, text);
      smsSent = true;
    } catch (e) {
      console.error("[솔라피] 출석 취소 알림 실패:", e);
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
      canceledSession,
      prevSession,
      totalSessions,
      message: text,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "취소 처리 오류";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
