"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import GlassCard from "@/components/ui/GlassCard";
import ProposalDisplay from "@/components/ProposalDisplay";
import { Proposal } from "@/lib/supabase";

export default function HistoryPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProposals(d.proposals);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 glass border-b border-white/8 px-8 py-4">
          <h1 className="text-lg font-semibold text-white">히스토리</h1>
          <p className="text-xs text-white/40 mt-0.5">이전에 생성한 제안서 목록</p>
        </div>

        <div className="px-8 py-8 max-w-4xl mx-auto">
          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <GlassCard className="border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
              <p className="text-xs text-white/30 mt-1">
                Supabase 환경변수가 올바르게 설정되었는지 확인하세요.
              </p>
            </GlassCard>
          )}

          {!isLoading && !error && proposals.length === 0 && (
            <GlassCard className="text-center py-12">
              <p className="text-white/40 text-sm">아직 생성된 제안서가 없습니다.</p>
              <a href="/" className="text-xs text-white/30 hover:text-white/50 transition-colors mt-2 inline-block">
                → 제안서 생성하러 가기
              </a>
            </GlassCard>
          )}

          {/* Selected Proposal View */}
          {selected && (
            <div className="mb-6">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mb-4"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                목록으로 돌아가기
              </button>
              <ProposalDisplay
                content={selected.content}
                title={selected.title || undefined}
                url={selected.url}
              />
            </div>
          )}

          {/* Proposal List */}
          {!selected && proposals.length > 0 && (
            <div className="space-y-3">
              {proposals.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="w-full text-left glass glass-hover rounded-2xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">
                        {p.title || p.url}
                      </p>
                      <p className="text-xs text-white/40 mt-1 truncate">{p.url}</p>
                      <p className="text-xs text-white/25 mt-2 line-clamp-2 leading-relaxed">
                        {p.content.slice(0, 120).replace(/[#*`]/g, "")}...
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-white/30">{formatDate(p.created_at)}</p>
                      <svg className="ml-auto mt-2 text-white/20" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
