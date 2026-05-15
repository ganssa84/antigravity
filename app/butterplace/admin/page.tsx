"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // 이미 로그인 상태면 대시보드로
  useEffect(() => {
    fetch("/api/butterplace/admin/check")
      .then((r) => { if (r.ok) router.replace("/butterplace/admin/dashboard"); })
      .finally(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/butterplace/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/butterplace/admin/dashboard");
    } else {
      const json = await res.json();
      setError(json.error ?? "로그인 실패");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-2xl text-amber-500 animate-pulse">확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-yellow-100 px-6">
      <div className="text-5xl mb-3">🎹</div>
      <h1 className="text-3xl font-black text-amber-700 mb-1">버터플레이스</h1>
      <p className="text-amber-600 mb-8">관리자 페이지</p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <label className="text-gray-600 font-semibold text-sm">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          className="border-2 border-amber-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-amber-400"
          autoFocus
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-lg transition-colors"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <a href="/butterplace" className="mt-6 text-amber-500 text-sm hover:underline">
        ← 출석 페이지로 돌아가기
      </a>
    </div>
  );
}
