import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { updateStudent, deleteStudent, getStudentById } from "@/lib/butterplace-db";

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("bp_admin")?.value === "authenticated";
}

// PUT /api/butterplace/students/[id]  — 학생 수정
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // sessions_per_cycle 변경 시 current_session이 새 값을 초과하지 않도록 조정
  if (body.sessions_per_cycle !== undefined) {
    const student = await getStudentById(id);
    if (student && student.current_session > body.sessions_per_cycle) {
      body.current_session = 0;
    }
  }

  const student = await updateStudent(id, body);
  return NextResponse.json({ student });
}

// DELETE /api/butterplace/students/[id]  — 학생 삭제
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  await deleteStudent(id);
  return NextResponse.json({ success: true });
}
