import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "버터플레이스",
  description: "버터플레이스 출결관리",
};

export default function ButtterplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-amber-50 text-gray-800">
      {children}
    </div>
  );
}
