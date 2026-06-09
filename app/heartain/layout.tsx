import type { Metadata } from "next";
import HeartainNav from "./nav";

export const metadata: Metadata = {
  title: "heartain 관리",
};

export default function HeartainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <HeartainNav />
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
