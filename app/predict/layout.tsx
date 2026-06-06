"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/predict/groups",   label: "Groups" },
  { href: "/predict/knockout", label: "Knockout" },
  { href: "/predict/awards",   label: "Awards" },
];

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === tab.href
                ? "bg-yellow-500 text-black"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
