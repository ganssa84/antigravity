"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Student {
  id: string;
  name: string;
  current_session: number;
  sessions_per_cycle: number;
  attendedToday: boolean;
}

interface SuccessInfo {
  name: string;
  sessionNumber: number;
  totalSessions: number;
  isLastSession: boolean;
}

const BUTTON_COLORS = [
  "bg-yellow-300 hover:bg-yellow-400 border-yellow-500",
  "bg-pink-300 hover:bg-pink-400 border-pink-500",
  "bg-blue-300 hover:bg-blue-400 border-blue-500",
  "bg-green-300 hover:bg-green-400 border-green-500",
  "bg-purple-300 hover:bg-purple-400 border-purple-500",
  "bg-orange-300 hover:bg-orange-400 border-orange-500",
  "bg-teal-300 hover:bg-teal-400 border-teal-500",
  "bg-rose-300 hover:bg-rose-400 border-rose-500",
  "bg-indigo-300 hover:bg-indigo-400 border-indigo-500",
  "bg-lime-300 hover:bg-lime-400 border-lime-500",
];

const COLOR_OVERRIDES: Record<string, string> = {
  "이유진": "bg-emerald-400 hover:bg-emerald-500 border-emerald-600",
};

export default function KioskPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [attending, setAttending] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const loadedDateRef = useRef(new Date().toDateString());

  // 시계 + 자정 감지
  useEffect(() => {
    const t = setInterval(() => {
      const current = new Date();
      setNow(current);
      if (current.toDateString() !== loadedDateRef.current) {
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/butterplace/students?scope=active");
      const json = await res.json();
      setStudents(json.students ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  async function handleAttend(student: Student) {
    if (student.attendedToday || attending) return;

    setAttending(student.id);
    setError(null);

    try {
      const res = await fetch("/api/butterplace/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "출석 처리 중 오류가 발생했습니다.");
        setTimeout(() => setError(null), 3000);
        return;
      }

      setSuccess({
        name: json.studentName,
        sessionNumber: json.sessionNumber,
        totalSessions: json.totalSessions,
        isLastSession: json.isLastSession,
      });

      // 학생 목록 갱신
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, attendedToday: true } : s
        )
      );

      // 3.5초 후 성공 화면 닫기
      setTimeout(() => setSuccess(null), 3500);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setAttending(null);
    }
  }

  const dateStr = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const timeStr = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-yellow-100 select-none">
      {/* 성공 오버레이 */}
      {success && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-400 text-white animate-fade-in">
          <div className="text-8xl mb-6">🎹</div>
          <div className="text-5xl font-black mb-4 text-center px-6">
            {success.name}
          </div>
          <div className="text-3xl font-bold mb-2">안녕! 잘 왔어요 😊</div>
          <div className="mt-6 bg-white/30 rounded-2xl px-8 py-4 text-center">
            <div className="text-2xl font-bold">
              {success.sessionNumber}/{success.totalSessions}회차 출석 완료!
            </div>
            {success.isLastSession && (
              <div className="text-xl mt-2 text-yellow-100">
                🎉 이번 사이클 마지막 수업이에요!
              </div>
            )}
          </div>
          <div className="mt-6 text-lg text-white/80">문자 메시지가 전송되었어요</div>
        </div>
      )}

      {/* 헤더 */}
      <header className="pt-8 pb-4 px-6 text-center">
        <div className="text-5xl mb-1">🎵</div>
        <h1 className="text-4xl font-black text-amber-700 tracking-tight">버터플레이스</h1>
        <p className="text-lg text-amber-600 mt-1">{dateStr}</p>
        <p className="text-3xl font-bold text-amber-800 mt-1">{timeStr}</p>
      </header>

      {/* 안내 문구 */}
      <div className="text-center py-3 px-6">
        <p className="text-2xl font-bold text-gray-700">내 이름을 눌러서 출석해요! 🎹</p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mx-6 mb-4 bg-red-100 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-center text-lg font-semibold">
          {error}
        </div>
      )}

      {/* 학생 버튼 그리드 */}
      <main className="flex-1 px-5 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-2xl text-amber-600 animate-pulse">불러오는 중...</div>
          </div>
        ) : students.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-2xl text-gray-400">등록된 학생이 없습니다</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {students.map((student, i) => {
              const colorClass = COLOR_OVERRIDES[student.name] ?? BUTTON_COLORS[i % BUTTON_COLORS.length];
              const isAttending = attending === student.id;
              const done = student.attendedToday;

              return (
                <button
                  key={student.id}
                  onClick={() => handleAttend(student)}
                  disabled={done || isAttending || !!attending}
                  className={`
                    relative rounded-3xl border-4 py-8 px-4
                    text-2xl font-black text-gray-800
                    transition-all duration-150 active:scale-95
                    ${colorClass}
                    ${done ? "opacity-50 cursor-not-allowed" : "cursor-pointer shadow-lg"}
                    ${isAttending ? "animate-pulse" : ""}
                  `}
                >
                  {done && (
                    <span className="absolute top-2 right-3 text-2xl">✅</span>
                  )}
                  <div className="text-3xl mb-1">{done ? "😊" : "🎵"}</div>
                  <div className="leading-tight">{student.name}</div>

                  {done && (
                    <div className="text-sm font-normal text-gray-500 mt-1">
                      출석 완료!
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="text-center py-4 text-sm text-amber-500">
        <a href="/butterplace/admin" className="opacity-30 hover:opacity-60 transition-opacity">
          관리자
        </a>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
