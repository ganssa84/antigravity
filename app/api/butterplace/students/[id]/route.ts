import { NextRequest, NextResponse } from "next/server";
import { updateStudent, deleteStudent, getStudentById } from "@/lib/butterplace-db";

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get("bp_admin")?.value === "authenticated";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    if (body.sessions_per_cycle !== undefined) {
      const student = await getStudentById(id);
      if (student && student.current_session > body.sessions_per_cycle) {
        body.current_session = 0;
      }
    }

    const student = await updateStudent(id, body);
    return NextResponse.json({ student });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteStudent(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
