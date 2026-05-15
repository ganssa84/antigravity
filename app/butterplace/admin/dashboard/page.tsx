"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────
interface Student {
  id: string;
  name: string;
  parent_phone: string;
  lessons_per_week: 1 | 2;
  sessions_per_cycle: number;
  current_session: number;
  current_cycle: number;
  is_active: boolean;
  birth_date?: string | null;
  note?: string | null;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  attended_at: string;
  session_number: number;
  cycle_number: number;
  is_makeup: boolean;
  is_noshow: boolean;
  kakao_sent: boolean;
  student: Student;
}

type Tab = "today" | "students" | "attendance" | "message" | "history";

interface MessageLog {
  id: string;
  sent_at: string;
  recipient: string;
  phone: string;
  message: string;
  type: "attendance" | "bulk";
  success: boolean;
}

// ────────────────────────────────────────
// 빈 학생 폼
// ────────────────────────────────────────
const emptyForm = (): Partial<Student> => ({
  name: "",
  parent_phone: "",
  lessons_per_week: 1,
  sessions_per_cycle: 4,
  birth_date: null,
  note: null,
});

// ────────────────────────────────────────
// Main
// ────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("today");

  // 인증 확인
  useEffect(() => {
    fetch("/api/butterplace/admin/check").then((r) => {
      if (!r.ok) router.replace("/butterplace/admin");
    });
  }, [router]);

  async function logout() {
    await fetch("/api/butterplace/admin/logout", { method: "POST" });
    router.push("/butterplace/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 상단바 */}
      <header className="bg-amber-400 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎹</span>
          <span className="font-black text-lg">버터플레이스 관리자</span>
        </div>
        <div className="flex gap-3 items-center">
          <a href="/butterplace" className="text-sm text-white/80 hover:text-white">
            키오스크 →
          </a>
          <button
            onClick={logout}
            className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 탭 */}
      <nav className="flex bg-white border-b border-gray-200">
        {(
          [
            { key: "today",      label: "오늘 현황", icon: "📊" },
            { key: "students",   label: "학생 관리", icon: "👧" },
            { key: "attendance", label: "출석 기록", icon: "📋" },
            { key: "message",    label: "메시지 발송", icon: "💬" },
            { key: "history",    label: "발송 히스토리", icon: "📜" },
          ] as { key: Tab; label: string; icon: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? "border-amber-400 text-amber-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="block text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* 탭 컨텐츠 */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {tab === "today"      && <TodayTab />}
        {tab === "students"   && <StudentsTab />}
        {tab === "attendance" && <AttendanceTab />}
        {tab === "message"    && <MessageTab />}
        {tab === "history"    && <HistoryTab />}
      </main>
    </div>
  );
}

// ────────────────────────────────────────
// Tab: 오늘 현황
// ────────────────────────────────────────
function TodayTab() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, studentsRes] = await Promise.all([
        fetch("/api/butterplace/attendance/today"),
        fetch("/api/butterplace/students?scope=all"),
      ]);
      const todayJson    = await todayRes.json().catch(() => ({}));
      const studentsJson = await studentsRes.json().catch(() => ({}));
      setRecords(todayJson.records ?? []);
      setAllStudents((studentsJson.students ?? []).filter((s: Student) => s.is_active));
    } catch {
      // 에러가 나도 로딩 종료
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const attendedIds = new Set(records.map((r) => r.student_id));
  const notYet = allStudents.filter((s) => !attendedIds.has(s.id));

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="오늘 출석" value={records.length} color="bg-green-100 text-green-700" />
        <StatCard label="미출석" value={notYet.length} color="bg-gray-100 text-gray-600" />
      </div>

      {/* 출석 완료 */}
      <Section title={`✅ 출석 완료 (${records.length}명)`}>
        {records.length === 0 ? (
          <EmptyMsg msg="아직 출석한 학생이 없어요" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {records.map((r) => {
              const t = new Date(r.attended_at);
              const time = t.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
              return (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{r.student?.name}</span>
                    {r.is_makeup && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">보강</span>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{time}</div>
                    <div className="text-xs">{r.session_number}/{r.student?.sessions_per_cycle}회차</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* 미출석 */}
      {notYet.length > 0 && (
        <Section title={`⏳ 미출석 (${notYet.length}명)`}>
          <ul className="divide-y divide-gray-100">
            {notYet.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between">
                <span className="font-semibold text-gray-500">{s.name}</span>
                <span className="text-xs text-gray-400">
                  {s.current_session}/{s.sessions_per_cycle}회차
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 결제 임박 알림 */}
      <PaymentAlertSection students={allStudents} />
    </div>
  );
}

function PaymentAlertSection({ students }: { students: Student[] }) {
  const alert = students.filter(
    (s) => s.current_session >= s.sessions_per_cycle - 1
  );
  if (alert.length === 0) return null;
  return (
    <Section title="💳 결제 안내 필요">
      <ul className="divide-y divide-gray-100">
        {alert.map((s) => (
          <li key={s.id} className="py-3 flex items-center justify-between">
            <span className="font-semibold text-orange-600">{s.name}</span>
            <span className="text-sm text-orange-500">
              {s.current_session === s.sessions_per_cycle - 1
                ? "다음 수업이 마지막!"
                : "이미 마지막 수업 완료"}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ────────────────────────────────────────
// Tab: 학생 관리
// ────────────────────────────────────────
function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "add" | "edit"; student?: Student } | null>(null);
  const [form, setForm] = useState<Partial<Student>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [addMakeup, setAddMakeup] = useState<Student | null>(null);
  const [confirmNoShow, setConfirmNoShow] = useState<Student | null>(null);
  const [confirmDouble, setConfirmDouble] = useState<Student | null>(null);
  const [confirmProxy, setConfirmProxy] = useState<Student | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/butterplace/students?scope=all");
      const json = await res.json().catch(() => ({}));
      setStudents(json.students ?? []);
    } catch {
      // 에러나도 로딩 종료
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  function openAdd() {
    setForm(emptyForm());
    setModal({ mode: "add" });
  }

  function openEdit(s: Student) {
    setForm({ ...s });
    setModal({ mode: "edit", student: s });
  }

  async function saveStudent() {
    if (!form.name || !form.parent_phone) return;
    setSaving(true);
    setSaveError(null);

    try {
      let res: Response;
      if (modal?.mode === "add") {
        res = await fetch("/api/butterplace/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch(`/api/butterplace/students/${modal!.student!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSaveError(json.error ?? `저장 실패 (${res.status})`);
        return;
      }

      setModal(null);
      fetchStudents();
    } catch {
      setSaveError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(s: Student) {
    await fetch(`/api/butterplace/students/${s.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    fetchStudents();
  }

  async function toggleActive(s: Student) {
    await fetch(`/api/butterplace/students/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    fetchStudents();
  }

  async function resetSession(s: Student) {
    await fetch(`/api/butterplace/students/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_session: 0 }),
    });
    fetchStudents();
  }

  async function handleMakeup(s: Student) {
    await fetch("/api/butterplace/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: s.id, is_makeup: true }),
    });
    setAddMakeup(null);
    fetchStudents();
  }

  async function handleProxy(s: Student) {
    const res = await fetch("/api/butterplace/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: s.id, is_makeup: true }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setActionError(j.error ?? "오류가 발생했습니다.");
      return;
    }
    setConfirmProxy(null);
    fetchStudents();
  }

  async function handleNoShow(s: Student) {
    const res = await fetch("/api/butterplace/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: s.id, is_noshow: true }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setActionError(j.error ?? "오류가 발생했습니다.");
      return;
    }
    setConfirmNoShow(null);
    fetchStudents();
  }

  async function handleDouble(s: Student) {
    const res = await fetch("/api/butterplace/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: s.id, is_double: true }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setActionError(j.error ?? "오류가 발생했습니다.");
      return;
    }
    setConfirmDouble(null);
    fetchStudents();
  }

  if (loading) return <Spinner />;

  const active   = students.filter((s) => s.is_active);
  const inactive = students.filter((s) => !s.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700">학생 목록 ({active.length}명 활성)</h2>
        <button
          onClick={openAdd}
          className="bg-amber-400 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm"
        >
          + 학생 추가
        </button>
      </div>

      {/* 활성 학생 */}
      <div className="space-y-3">
        {active.map((s) => (
          <StudentCard
            key={s.id}
            student={s}
            onEdit={() => openEdit(s)}
            onToggle={() => toggleActive(s)}
            onReset={() => resetSession(s)}
            onMakeup={() => setAddMakeup(s)}
            onProxy={() => setConfirmProxy(s)}
            onNoShow={() => setConfirmNoShow(s)}
            onDouble={() => setConfirmDouble(s)}
            onDelete={() => setConfirmDelete(s)}
          />
        ))}
      </div>

      {/* 비활성 학생 */}
      {inactive.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 mt-4">비활성 학생</h3>
          <div className="space-y-3 opacity-60">
            {inactive.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                onEdit={() => openEdit(s)}
                onToggle={() => toggleActive(s)}
                onReset={() => resetSession(s)}
                onMakeup={() => setAddMakeup(s)}
                onProxy={() => setConfirmProxy(s)}
                onNoShow={() => setConfirmNoShow(s)}
                onDouble={() => setConfirmDouble(s)}
                onDelete={() => setConfirmDelete(s)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 학생 추가/수정 모달 */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <h2 className="text-xl font-bold mb-4">
            {modal.mode === "add" ? "학생 추가" : "학생 수정"}
          </h2>
          <div className="space-y-3">
            <Field label="이름 *">
              <input
                className={inputCls}
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="홍길동"
              />
            </Field>
            <Field label="학부모 번호 *">
              <input
                className={inputCls}
                value={form.parent_phone ?? ""}
                onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                placeholder="010-1234-5678"
                inputMode="tel"
              />
            </Field>
            <Field label="주 수업 횟수">
              <select
                className={inputCls}
                value={form.lessons_per_week}
                onChange={(e) => {
                  const lw = Number(e.target.value) as 1 | 2;
                  setForm({ ...form, lessons_per_week: lw, sessions_per_cycle: lw === 2 ? 8 : 4 });
                }}
              >
                <option value={1}>주 1회</option>
                <option value={2}>주 2회</option>
              </select>
            </Field>
            <Field label="결제 사이클 회차">
              <input
                className={inputCls}
                type="number"
                min={1}
                max={20}
                value={form.sessions_per_cycle ?? 4}
                onChange={(e) => setForm({ ...form, sessions_per_cycle: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-400 mt-1">기본: 주1회=4회, 주2회=8회</p>
            </Field>
            <Field label="현재 회차">
              <input
                className={inputCls}
                type="number"
                min={0}
                max={form.sessions_per_cycle ?? 8}
                value={form.current_session ?? 0}
                onChange={(e) => setForm({ ...form, current_session: Number(e.target.value) })}
              />
            </Field>
            <Field label="생일 (선택)">
              <input
                className={inputCls}
                type="date"
                value={form.birth_date ?? ""}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })}
              />
            </Field>
            <Field label="메모 (선택)">
              <textarea
                className={inputCls}
                rows={2}
                value={form.note ?? ""}
                onChange={(e) => setForm({ ...form, note: e.target.value || null })}
                placeholder="특이사항..."
              />
            </Field>
          </div>
          {saveError && (
            <p className="text-red-500 text-sm text-center mt-3">{saveError}</p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setModal(null)}
              className="flex-1 border border-gray-300 rounded-xl py-2 text-gray-600"
            >
              취소
            </button>
            <button
              onClick={saveStudent}
              disabled={saving || !form.name || !form.parent_phone}
              className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl py-2"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <h2 className="text-xl font-bold mb-3 text-red-600">학생 삭제</h2>
          <p className="text-gray-600 mb-5">
            <strong>{confirmDelete.name}</strong>을(를) 삭제하면 출석 기록도 모두 삭제됩니다. 계속할까요?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 border border-gray-300 rounded-xl py-2 text-gray-600"
            >
              취소
            </button>
            <button
              onClick={() => deleteStudent(confirmDelete)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl py-2"
            >
              삭제
            </button>
          </div>
        </Modal>
      )}

      {/* 보강 확인 모달 */}
      {addMakeup && (
        <Modal onClose={() => setAddMakeup(null)}>
          <h2 className="text-xl font-bold mb-3">보강 출석 추가</h2>
          <p className="text-gray-600 mb-5">
            <strong>{addMakeup.name}</strong>의 보강 출석을 오늘 날짜로 추가합니다.
            회차가 1 증가합니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setAddMakeup(null)}
              className="flex-1 border border-gray-300 rounded-xl py-2 text-gray-600"
            >
              취소
            </button>
            <button
              onClick={() => handleMakeup(addMakeup)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl py-2"
            >
              추가
            </button>
          </div>
        </Modal>
      )}

      {/* 액션 오류 모달 */}
      {actionError && (
        <Modal onClose={() => setActionError(null)}>
          <h2 className="text-xl font-bold mb-3 text-red-600">처리 실패</h2>
          <p className="text-gray-600 mb-5">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl py-2"
          >
            확인
          </button>
        </Modal>
      )}

      {/* 대신 출석 확인 모달 */}
      {confirmProxy && (
        <Modal onClose={() => setConfirmProxy(null)}>
          <h2 className="text-xl font-bold mb-3">대신 출석 처리</h2>
          <p className="text-gray-600 mb-2">
            <strong>{confirmProxy.name}</strong> 학생이 키오스크에서 이름을 누르지 못한 경우 사용합니다.
          </p>
          <div className="bg-green-50 rounded-xl p-3 mb-5 text-sm text-green-700 space-y-1">
            <p>• {confirmProxy.current_session}/{confirmProxy.sessions_per_cycle}회차 →
              {" "}{confirmProxy.current_session + 1}/{confirmProxy.sessions_per_cycle}회차 처리</p>
            <p>• 부모님께 정상 출석 알림이 발송됩니다</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmProxy(null)}
              className="flex-1 border border-gray-300 rounded-xl py-2 text-gray-600"
            >
              취소
            </button>
            <button
              onClick={() => handleProxy(confirmProxy)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl py-2"
            >
              출석 처리
            </button>
          </div>
        </Modal>
      )}

      {/* 결석 차감 확인 모달 */}
      {confirmNoShow && (
        <Modal onClose={() => setConfirmNoShow(null)}>
          <h2 className="text-xl font-bold mb-3 text-orange-600">결석 차감</h2>
          <p className="text-gray-600 mb-2">
            <strong>{confirmNoShow.name}</strong> 학생이 오늘 수업에 불참한 것으로 처리합니다.
          </p>
          <div className="bg-orange-50 rounded-xl p-3 mb-5 text-sm text-orange-700 space-y-1">
            <p>• 현재 {confirmNoShow.current_session}/{confirmNoShow.sessions_per_cycle}회차 →
              {" "}{confirmNoShow.current_session + 1}/{confirmNoShow.sessions_per_cycle}회차 차감</p>
            <p>• 부모님 핸드폰으로 불참 알림이 자동 발송됩니다</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmNoShow(null)}
              className="flex-1 border border-gray-300 rounded-xl py-2 text-gray-600"
            >
              취소
            </button>
            <button
              onClick={() => handleNoShow(confirmNoShow)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-2"
            >
              차감 처리
            </button>
          </div>
        </Modal>
      )}

      {/* 당일 1회 추가 확인 모달 */}
      {confirmDouble && (
        <Modal onClose={() => setConfirmDouble(null)}>
          <h2 className="text-xl font-bold mb-3 text-purple-600">당일 1회 추가</h2>
          <p className="text-gray-600 mb-2">
            <strong>{confirmDouble.name}</strong> 학생이 오늘 이미 출석한 상태에서 1회를 추가합니다.
          </p>
          <div className="bg-purple-50 rounded-xl p-3 mb-5 text-sm text-purple-700 space-y-1">
            <p>• 현재 {confirmDouble.current_session}/{confirmDouble.sessions_per_cycle}회차 →
              {" "}{confirmDouble.current_session + 1}/{confirmDouble.sessions_per_cycle}회차 추가</p>
            <p>• 부모님께 추가 출석 알림이 발송됩니다</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDouble(null)}
              className="flex-1 border border-gray-300 rounded-xl py-2 text-gray-600"
            >
              취소
            </button>
            <button
              onClick={() => handleDouble(confirmDouble)}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl py-2"
            >
              1회 추가
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StudentCard({
  student,
  onEdit,
  onToggle,
  onReset,
  onMakeup,
  onProxy,
  onNoShow,
  onDouble,
  onDelete,
}: {
  student: Student;
  onEdit: () => void;
  onToggle: () => void;
  onReset: () => void;
  onMakeup: () => void;
  onProxy: () => void;
  onNoShow: () => void;
  onDouble: () => void;
  onDelete: () => void;
}) {
  const progress = student.current_session / student.sessions_per_cycle;
  const isLast = student.current_session >= student.sessions_per_cycle - 1 && student.is_active;

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 border ${isLast ? "border-orange-300" : "border-gray-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{student.name}</span>
            {isLast && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">결제 임박</span>
            )}
          </div>
          <div className="text-sm text-gray-500">{student.parent_phone}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            주 {student.lessons_per_week}회 · {student.sessions_per_cycle}회차/사이클
            {student.note && ` · ${student.note}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-amber-600">
            {student.current_session}/{student.sessions_per_cycle}
          </div>
          <div className="text-xs text-gray-400">회차</div>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className="bg-amber-400 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 flex-wrap">
        <ActionBtn onClick={onEdit} label="수정" />
        <ActionBtn onClick={onProxy} label="대신출석" color="green" />
        <ActionBtn onClick={onMakeup} label="보강" color="blue" />
        <ActionBtn onClick={onNoShow} label="결석차감" color="orange" />
        <ActionBtn onClick={onDouble} label="당일1회추가" color="purple" />
        <ActionBtn onClick={onReset} label="회차초기화" color="gray" />
        <ActionBtn onClick={onToggle} label={student.is_active ? "비활성" : "활성화"} color="gray" />
        <ActionBtn onClick={onDelete} label="삭제" color="red" />
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab: 출석 기록
// ────────────────────────────────────────
function AttendanceTab() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/butterplace/attendance?year=${year}&month=${month}`);
      const json = await res.json().catch(() => ({}));
      setRecords(json.records ?? []);
    } catch {
      // 에러나도 로딩 종료
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  }

  // 학생별 그룹
  const byStudent = records.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    const n = r.student?.name ?? r.student_id;
    acc[n] = acc[n] ?? [];
    acc[n].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* 월 선택 */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm">
        <button onClick={prevMonth} className="text-2xl px-2 text-gray-600">‹</button>
        <span className="font-bold text-gray-700">{year}년 {month}월</span>
        <button onClick={nextMonth} className="text-2xl px-2 text-gray-600">›</button>
      </div>

      <div className="text-sm text-gray-500">총 {records.length}건</div>

      {loading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <EmptyMsg msg="출석 기록이 없습니다" />
      ) : (
        Object.entries(byStudent)
          .sort(([a], [b]) => a.localeCompare(b, "ko"))
          .map(([name, recs]) => (
            <Section key={name} title={`${name} (${recs.length}회)`}>
              <ul className="divide-y divide-gray-100">
                {recs.map((r) => {
                  const d = new Date(r.attended_at);
                  const dateStr = d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });
                  const timeStr = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{dateStr} {timeStr}</span>
                        {r.is_makeup && !r.is_noshow && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 rounded">보강</span>
                        )}
                        {r.is_noshow && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 rounded">결석차감</span>
                        )}
                      </div>
                      <div className="text-gray-500">
                        {r.session_number}/{r.student?.sessions_per_cycle}회차
                        {r.kakao_sent && <span className="ml-1 text-green-500">✓발송</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          ))
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Tab: 메시지 발송
// ────────────────────────────────────────
function MessageTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [text, setText] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [allSelected, setAllSelected] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/butterplace/students?scope=all").then((r) => r.json()).then((j) => {
      const active = (j.students ?? []).filter((s: Student) => s.is_active);
      setStudents(active);
      setTargets(active.map((s: Student) => s.id));
    });
  }, []);

  function toggleStudent(id: string) {
    setTargets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setAllSelected(false);
  }

  function toggleAll() {
    if (allSelected) {
      setTargets([]);
      setAllSelected(false);
    } else {
      setTargets(students.map((s) => s.id));
      setAllSelected(true);
    }
  }

  async function send() {
    if (!text.trim() || targets.length === 0) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/butterplace/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targets: allSelected ? "all" : targets }),
      });
      const json = await res.json();
      setResult(res.ok ? `✅ ${json.sent}명에게 발송 완료!` : `❌ ${json.error}`);
      if (res.ok) setText("");
    } catch {
      setResult("❌ 네트워크 오류");
    }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <Section title="메시지 작성">
        <textarea
          className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-amber-300"
          rows={5}
          placeholder="학부모님께 보낼 메시지를 입력하세요..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">
          [버터플레이스] 문구는 자동으로 추가되지 않습니다. 필요시 직접 입력해주세요.
        </p>
      </Section>

      <Section title="수신자 선택">
        <div className="mb-2">
          <button
            onClick={toggleAll}
            className={`text-sm px-3 py-1 rounded-full font-semibold border ${
              allSelected
                ? "bg-amber-400 border-amber-400 text-white"
                : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            전체 선택 ({students.length}명)
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {students.map((s) => {
            const sel = targets.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleStudent(s.id)}
                className={`text-sm px-3 py-1 rounded-full border font-medium transition-colors ${
                  sel
                    ? "bg-amber-100 border-amber-400 text-amber-700"
                    : "bg-white border-gray-300 text-gray-500"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </Section>

      {result && (
        <div className="bg-gray-50 rounded-xl p-3 text-center font-semibold text-sm">
          {result}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !text.trim() || targets.length === 0}
        className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-lg"
      >
        {sending ? "발송 중..." : `💬 ${targets.length}명에게 발송`}
      </button>
    </div>
  );
}

// ────────────────────────────────────────
// Tab: 발송 히스토리
// ────────────────────────────────────────
function HistoryTab() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/butterplace/message/history");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `오류 (${res.status})`);
      } else {
        setLogs(json.logs ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700">발송 히스토리</h2>
        <button
          onClick={fetchLogs}
          className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
        >
          새로고침
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">오류 발생</p>
          <p>{error}</p>
          <p className="mt-2 text-xs text-red-400">Supabase에서 bp_message_log 테이블이 생성되어 있는지 확인해주세요.</p>
        </div>
      )}

      {!error && logs.length === 0 ? (
        <EmptyMsg msg="발송 기록이 없습니다" />
      ) : !error && (
        <div className="space-y-2">
          {logs.map((log) => {
            const d = new Date(log.sent_at);
            const dateStr = d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });
            const timeStr = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
            return (
              <div
                key={log.id}
                className={`bg-white rounded-2xl shadow-sm p-4 border ${log.success ? "border-gray-100" : "border-red-200"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{log.recipient}</span>
                    <span className="text-xs text-gray-400">{log.phone}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      log.type === "attendance"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {log.type === "attendance" ? "출석" : "공지"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      log.success
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {log.success ? "✓ 발송됨" : "✗ 실패"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {dateStr} {timeStr}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-snug whitespace-pre-wrap">{log.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// 공통 UI 컴포넌트
// ────────────────────────────────────────
const inputCls =
  "w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-300";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-2xl text-amber-400 animate-pulse">불러오는 중...</div>
    </div>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return <p className="text-center text-gray-400 py-6 text-sm">{msg}</p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <h3 className="font-bold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-sm font-semibold mt-1">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  label,
  color = "amber",
}: {
  onClick: () => void;
  label: string;
  color?: "amber" | "blue" | "red" | "gray" | "orange" | "purple" | "green";
}) {
  const colors = {
    amber:  "bg-amber-100 text-amber-700 hover:bg-amber-200",
    blue:   "bg-blue-100 text-blue-700 hover:bg-blue-200",
    red:    "bg-red-100 text-red-700 hover:bg-red-200",
    gray:   "bg-gray-100 text-gray-600 hover:bg-gray-200",
    orange: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    purple: "bg-purple-100 text-purple-700 hover:bg-purple-200",
    green:  "bg-green-100 text-green-700 hover:bg-green-200",
  };
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${colors[color]}`}
    >
      {label}
    </button>
  );
}
