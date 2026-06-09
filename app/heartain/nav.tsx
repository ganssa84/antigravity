"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/heartain/analytics",  label: "매출 분석" },
  { href: "/heartain/inventory",  label: "재고 현황" },
  { href: "/heartain/sales",      label: "판매 입력" },
  { href: "/heartain/stock",      label: "입고 관리" },
  { href: "/heartain/orders",     label: "발주 관리" },
];

export default function HeartainNav() {
  const path = usePathname();
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-8 sticky top-0 z-10">
      <span className="text-base font-bold tracking-tight text-gray-900">
        🧸 heartain
      </span>
      <nav className="flex gap-1">
        {NAV.map((item) => {
          const active = path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
