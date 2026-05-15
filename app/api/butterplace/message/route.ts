import { NextRequest, NextResponse } from "next/server";
import { getAllStudents, getStudentById } from "@/lib/butterplace-db";
import { sendSMS, sendBulkSMS } from "@/lib/solapi";

export async function POST(req: NextRequest) {
  if (req.cookies.get("bp_admin")?.value !== "authenticated") {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { text, targets } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "메시지 내용이 필요합니다." }, { status: 400 });
    }

    let messages: { to: string; text: string }[] = [];

    if (targets === "all") {
      const students = await getAllStudents();
      messages = students.filter((s) => s.is_active).map((s) => ({ to: s.parent_phone, text }));
    } else if (Array.isArray(targets)) {
      for (const id of targets) {
        const s = await getStudentById(id);
        if (s) messages.push({ to: s.parent_phone, text });
      }
    } else {
      return NextResponse.json({ error: "targets는 'all' 또는 학생 ID 배열이어야 합니다." }, { status: 400 });
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: "발송할 수신자가 없습니다." }, { status: 400 });
    }

    if (messages.length === 1) {
      await sendSMS(messages[0].to, messages[0].text);
    } else {
      await sendBulkSMS(messages);
    }

    return NextResponse.json({ success: true, sent: messages.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
