"use client";

import { useState, useEffect } from "react";
import GlassCard from "@/components/ui/GlassCard";
import ProposalDisplay from "@/components/ProposalDisplay";
import PromptEditor from "@/components/PromptEditor";
import Sidebar from "@/components/Sidebar";

const DEFAULT_PROMPT = `당신은 전문 비즈니스 컨설턴트입니다.
주어진 기업 정보를 바탕으로 마케팅/사업 제안서를 한국어로 작성하세요.

다음 섹션으로 구성하세요:
1. **요약** - 핵심 제안 요약 (2~3문장)
2. **현황 분석** - 해당 기업의 현재 상황 및 과제
3. **제안 내용** - 구체적인 서비스/솔루션 제안
4. **기대 효과** - 도입 시 예상 효과 및 ROI
5. **다음 단계** - 실행 계획 및 연락처

전문적이고 설득력 있는 어조로 작성하세요.`;

export default function Home() {
  const [url, setUrl] = useState("");
  const [proposal, setProposal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [scrapedTitle, setScrapedTitle] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("customPrompt");
    if (saved) setCustomPrompt(saved);
  }, []);

  async function handleGenerate() {
    if (!url.trim()) return;
    setIsLoading(true);
    setError("");
    setProposal("");
    setScrapedTitle("");

    try {
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) throw new Error(scrapeData.error || "URL 스크래핑 실패");

      setScrapedTitle(scrapeData.title || url);

      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          scrapedContent: scrapeData,
          customPrompt,
        }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "제안서 생성 실패");

      setProposal(genData.proposal);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 glass border-b border-white/8 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">AI 제안서 생성기</h1>
            <p className="text-xs text-white/40 mt-0.5">URL을 입력하면 맞춤형 사업 제안서를 자동으로 생성합니다</p>
          </div>
          <button
            onClick={() => setShowPromptEditor(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 glass glass-hover transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            프롬프트 편집
          </button>
        </div>

        <div className="px-8 py-8 max-w-4xl mx-auto space-y-6">
          {/* URL Input */}
          <GlassCard>
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
              대상 URL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                placeholder="https://company.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/25 focus:bg-white/8 transition-all"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading || !url.trim()}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                {isLoading ? "생성 중..." : "제안서 생성"}
              </button>
            </div>
          </GlassCard>

          {/* Loading */}
          {isLoading && (
            <GlassCard className="flex items-center gap-4">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/40 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-sm text-white/50">
                {scrapedTitle ? `"${scrapedTitle}" 분석 후 제안서 작성 중...` : "URL 분석 중..."}
              </span>
            </GlassCard>
          )}

          {/* Error */}
          {error && (
            <GlassCard className="border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </GlassCard>
          )}

          {/* Proposal */}
          {proposal && (
            <ProposalDisplay
              content={proposal}
              title={scrapedTitle}
              url={url}
              promptUsed={customPrompt}
            />
          )}
        </div>
      </main>

      {/* Prompt Editor Modal */}
      {showPromptEditor && (
        <PromptEditor
          prompt={customPrompt}
          defaultPrompt={DEFAULT_PROMPT}
          onSave={(p) => {
            setCustomPrompt(p);
            localStorage.setItem("customPrompt", p);
            setShowPromptEditor(false);
          }}
          onClose={() => setShowPromptEditor(false)}
        />
      )}
    </div>
  );
}
