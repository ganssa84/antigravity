"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "생성하기",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "히스토리",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col h-full glass border-r border-white/8 px-4 py-6 gap-2">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <span className="font-semibold text-sm tracking-wide text-white/90">Antigravity</span>
      </div>

      <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest px-2 mb-1">메뉴</p>

      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
          >
            <span className={isActive ? "text-white" : "text-white/40"}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-[11px] text-white/40 leading-relaxed">
            URL을 입력하면<br />맞춤형 제안서를<br />자동으로 생성합니다
          </p>
        </div>
      </div>
    </aside>
  );
}
