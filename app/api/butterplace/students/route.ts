import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAllStudents, getActiveStudents, createStudent, getTodayAttendedIds } from "@/lib/butterplace-db";

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("bp_admin")?.value === "authenticated";
}

// GET /api/butterplace/students
// ?scope=active  → 출석 키오스크용 활성 학생 + 오늘 출석 여부
// ?scope=all     → 관리자용 전체 목록 (인증 필요)
export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get("scope") ?? "active";

  if (scope === "all") {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }
    const students = await getAllStudents();
    return NextResponse.json({ students });
  }

  // scope === "active"
  const [students, attendedIds] = await Promise.all([
    getActiveStudents(),
    getTodayAttendedIds(),
  ]);

  const attendedSet = new Set(attendedIds);
  const result = students.map((s) => ({ ...s, attendedToday: attendedSet.has(s.id) }));

  return NextResponse.json({ students: result });
}

// POST /api/butterplace/students  — 학생 추가 (관리자 전용)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { name, parent_phone, lessons_per_week, sessions_per_cycle, birth_date, note } = body;

  if (!name || !parent_phone) {
    return NextResponse.json({ error: "이름과 학부모 번호는 필수입니다." }, { status: 400 });
  }

  const student = await createStudent({
    name,
    parent_phone,
    lessons_per_week: lessons_per_week ?? 1,
    sessions_per_cycle: sessions_per_cycle ?? (lessons_per_week === 2 ? 8 : 4),
    birth_date: birth_date ?? null,
    note: note ?? null,
  });

  return NextResponse.json({ student }, { status: 201 });
}
