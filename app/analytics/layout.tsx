import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics Dashboard | Antigravity",
  description: "eCommerce 매출 분석 대시보드",
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {children}
    </div>
  );
}
