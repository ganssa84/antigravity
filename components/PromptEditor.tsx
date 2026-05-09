"use client";

import { useState } from "react";

interface PromptEditorProps {
  prompt: string;
  defaultPrompt: string;
  onSave: (prompt: string) => void;
  onClose: () => void;
}

export default function PromptEditor({ prompt, defaultPrompt, onSave, onClose }: PromptEditorProps) {
  const [value, setValue] = useState(prompt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="glass rounded-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h2 className="text-sm font-semibold text-white">프롬프트 편집</h2>
            <p className="text-xs text-white/40 mt-0.5">AI 제안서 생성 방식을 커스터마이즈하세요</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-80 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/80 placeholder-white/20 outline-none focus:border-white/25 resize-none font-mono leading-relaxed"
            placeholder="시스템 프롬프트를 입력하세요..."
          />
          <p className="text-xs text-white/30 mt-2">
            이 프롬프트는 브라우저에 저장됩니다. AI가 제안서를 생성할 때 사용됩니다.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
          <button
            onClick={() => setValue(defaultPrompt)}
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            기본값 복원
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-white/50 glass glass-hover transition-all"
            >
              취소
            </button>
            <button
              onClick={() => onSave(value)}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/90 transition-all"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
