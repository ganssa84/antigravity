import { NextRequest, NextResponse } from "next/server";
import { getAllStudents, getActiveStudents, createStudent, getTodayAttendedIds } from "@/lib/butterplace-db";

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get("bp_admin")?.value === "authenticated";
}

export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get("scope") ?? "active";

  if (scope === "all") {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }
    try {
      const students = await getAllStudents();
      return NextResponse.json({ students });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  try {
    const [students, attendedIds] = await Promise.all([
      getActiveStudents(),
      getTodayAttendedIds(),
    ]);
    const attendedSet = new Set(attendedIds);
    const result = students.map((s) => ({ ...s, attendedToday: attendedSet.has(s.id) }));
    return NextResponse.json({ students: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
