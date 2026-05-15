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
  student: Pick<Student, "name" | "parent_phone" | "lessons_per_week" | "sessions_per_cycle" | "birth_date" | "note">
): Promise<Student> {
  const { data, error } = await getClient()
    .from("bp_students")
    .insert({ ...student, current_session: 0, current_cycle: 1, is_active: true })
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
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
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
  isNoShow = false
): Promise<MarkResult> {
  const client = getClient();

  const student = await getStudentById(studentId);
  if (!student) throw new Error("학생을 찾을 수 없습니다.");
  if (!student.is_active) throw new Error("비활성 학생입니다.");

  if (!isMakeup && !isNoShow && (await isAlreadyAttendedToday(studentId))) {
    throw new Error("오늘 이미 출석했습니다.");
  }

  const newSession = student.current_session + 1;
  const isLastSession = newSession >= student.sessions_per_cycle;

  const { data: attendance, error: attErr } = await client
    .from("bp_attendance")
    .insert({
      student_id: studentId,
      session_number: newSession,
      cycle_number: student.current_cycle,
      is_makeup: isMakeup,
      is_noshow: isNoShow,
      kakao_sent: false,
    })
    .select()
    .single();
  if (attErr) throw attErr;

  // 마지막 회차면 사이클 리셋, 아니면 회차 증가
  const updatedStudent = await updateStudent(studentId, {
    current_session: isLastSession ? 0 : newSession,
    current_cycle: isLastSession ? student.current_cycle + 1 : student.current_cycle,
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

export async function getMessageLogs(limit = 100): Promise<MessageLog[]> {
  const { data, error } = await getClient()
    .from("bp_message_log")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
