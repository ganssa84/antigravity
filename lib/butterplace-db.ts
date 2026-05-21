import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  parent_phone: string;
  lessons_per_week: 1 | 2;
  sessions_per_cycle: number;  // 4 or 8
  current_session: number;     // 0 ~ sessions_per_cycle
  current_cycle: number;
  is_active: boolean;
  birth_date?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  attended_at: string;
  session_number: number;
  cycle_number: number;
  is_makeup: boolean;
  is_noshow: boolean;
  kakao_sent: boolean;
  created_at: string;
}

export interface AttendanceWithStudent extends Attendance {
  student: Student;
}

// ────────────────────────────────────────
// Student queries
// ────────────────────────────────────────

export async function getActiveStudents(): Promise<Student[]> {
  const { data, error } = await getClient()
    .from("bp_students")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getAllStudents(): Promise<Student[]> {
  const { data, error } = await getClient()
    .from("bp_students")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { data, error } = await getClient()
    .from("bp_students")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function createStudent(
  student: Pick<Student, "name" | "parent_phone" | "lessons_per_week" | "sessions_per_cycle" | "birth_date" | "note"> & { current_session?: number; current_cycle?: number }
): Promise<Student> {
  const { data, error } = await getClient()
    .from("bp_students")
    .insert({
      ...student,
      current_session: student.current_session ?? 0,
      current_cycle: student.current_cycle ?? 1,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudent(
  id: string,
  updates: Partial<Omit<Student, "id" | "created_at" | "updated_at">>
): Promise<Student> {
  const { data, error } = await getClient()
    .from("bp_students")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await getClient()
    .from("bp_students")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ────────────────────────────────────────
// Attendance queries
// ────────────────────────────────────────

function todayRange(): { start: string; end: string } {
  // Vercel 서버는 UTC — KST(+9) 기준 오늘 자정을 UTC로 계산
  const KST = 9 * 60 * 60 * 1000;
  const nowKST = new Date(Date.now() + KST);
  const y = nowKST.getUTCFullYear();
  const m = nowKST.getUTCMonth();
  const d = nowKST.getUTCDate();
  const start = new Date(Date.UTC(y, m, d) - KST);     // KST 00:00 → UTC 전날 15:00
  const end   = new Date(Date.UTC(y, m, d + 1) - KST); // KST 다음날 00:00 → UTC 15:00
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function isAlreadyAttendedToday(studentId: string): Promise<boolean> {
  const { start, end } = todayRange();
  const { data } = await getClient()
    .from("bp_attendance")
    .select("id")
    .eq("student_id", studentId)
    .gte("attended_at", start)
    .lt("attended_at", end)
    .limit(1);
  return (data ?? []).length > 0;
}

export interface MarkResult {
  attendance: Attendance;
  student: Student;
  isLastSession: boolean;
  sessionNumber: number;
  totalSessions: number;
}

export async function markAttendance(
  studentId: string,
  isMakeup = false,
  isNoShow = false,
  attendedAt?: string  // ISO date string — 지정 시 해당 날짜로 기록, 중복 체크 우회
): Promise<MarkResult> {
  const client = getClient();

  const student = await getStudentById(studentId);
  if (!student) throw new Error("학생을 찾을 수 없습니다.");
  if (!student.is_active) throw new Error("비활성 학생입니다.");

  if (!isMakeup && !isNoShow && !attendedAt && (await isAlreadyAttendedToday(studentId))) {
    throw new Error("오늘 이미 출석했습니다.");
  }

  // current_session이 sessions_per_cycle 이상이면 사이클이 완료된 상태 — 새 사이클 1회차로 처리
  const cycleOverflow = student.current_session >= student.sessions_per_cycle;
  const baseSession   = cycleOverflow ? 0 : student.current_session;
  const baseCycle     = cycleOverflow ? student.current_cycle + 1 : student.current_cycle;

  const newSession    = baseSession + 1;
  const isLastSession = newSession >= student.sessions_per_cycle;

  const insertData: Record<string, unknown> = {
    student_id: studentId,
    session_number: newSession,
    cycle_number: baseCycle,
    is_makeup: isMakeup,
    is_noshow: isNoShow,
    kakao_sent: false,
  };
  if (attendedAt) insertData.attended_at = attendedAt;

  const { data: attendance, error: attErr } = await client
    .from("bp_attendance")
    .insert(insertData)
    .select()
    .single();
  if (attErr) throw attErr;

  // 마지막 회차면 사이클 리셋, 아니면 회차 증가
  const updatedStudent = await updateStudent(studentId, {
    current_session: isLastSession ? 0 : newSession,
    current_cycle:   isLastSession ? baseCycle + 1 : baseCycle,
  });

  return {
    attendance,
    student: updatedStudent,
    isLastSession,
    sessionNumber: newSession,
    totalSessions: student.sessions_per_cycle,
  };
}

export async function getTodayAttendance(): Promise<AttendanceWithStudent[]> {
  const { start, end } = todayRange();
  const { data, error } = await getClient()
    .from("bp_attendance")
    .select("*, bp_students(*)")
    .gte("attended_at", start)
    .lt("attended_at", end)
    .order("attended_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, student: row.bp_students as Student }));
}

export async function getTodayAttendedIds(): Promise<string[]> {
  const { start, end } = todayRange();
  const { data } = await getClient()
    .from("bp_attendance")
    .select("student_id")
    .gte("attended_at", start)
    .lt("attended_at", end);
  return (data ?? []).map((r) => r.student_id as string);
}

export async function getStudentAttendanceHistory(
  studentId: string,
  limit = 50
): Promise<Attendance[]> {
  const { data, error } = await getClient()
    .from("bp_attendance")
    .select("*")
    .eq("student_id", studentId)
    .order("attended_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getAllAttendanceByMonth(
  year: number,
  month: number
): Promise<AttendanceWithStudent[]> {
  const start = new Date(year, month - 1, 1).toISOString();
  const end   = new Date(year, month,     1).toISOString();
  const { data, error } = await getClient()
    .from("bp_attendance")
    .select("*, bp_students(*)")
    .gte("attended_at", start)
    .lt("attended_at", end)
    .order("attended_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, student: row.bp_students as Student }));
}

export async function updateKakaoSent(attendanceId: string): Promise<void> {
  const { error } = await getClient()
    .from("bp_attendance")
    .update({ kakao_sent: true })
    .eq("id", attendanceId);
  if (error) throw error;
}

export interface MessageLog {
  id: string;
  sent_at: string;
  recipient: string;
  phone: string;
  message: string;
  type: "attendance" | "bulk";
  success: boolean;
}

export async function logMessage(log: Omit<MessageLog, "id" | "sent_at">): Promise<void> {
  await getClient().from("bp_message_log").insert(log);
}

export interface CancelResult {
  student: Student;
  canceledSession: number;
  totalSessions: number;
  attendedAt: string;
}

export async function cancelLastAttendance(studentId: string): Promise<CancelResult> {
  const client = getClient();

  const student = await getStudentById(studentId);
  if (!student) throw new Error("학생을 찾을 수 없습니다.");
  if (!student.is_active) throw new Error("비활성 학생입니다.");

  const { data: last, error: fetchErr } = await client
    .from("bp_attendance")
    .select("*")
    .eq("student_id", studentId)
    .order("attended_at", { ascending: false })
    .limit(1)
    .single();
  if (fetchErr || !last) throw new Error("취소할 출석 기록이 없습니다.");

  const { error: delErr } = await client
    .from("bp_attendance")
    .delete()
    .eq("id", last.id);
  if (delErr) throw delErr;

  // session_number - 1 로 복원, cycle도 기록 당시 cycle로 복원
  const updatedStudent = await updateStudent(studentId, {
    current_session: last.session_number - 1,
    current_cycle: last.cycle_number,
  });

  return {
    student: updatedStudent,
    canceledSession: last.session_number,
    totalSessions: student.sessions_per_cycle,
    attendedAt: last.attended_at,
  };
}

export async function getMessageLogs(limit = 100): Promise<MessageLog[]> {
  const { data, error } = await getClient()
    .from("bp_message_log")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
