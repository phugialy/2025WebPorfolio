"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "assets", label: "Assets", href: "/admin/affiliate" },
  { key: "placements", label: "Placements", href: "/admin/affiliate/placements" },
  { key: "articles", label: "Articles", href: "/admin/affiliate/articles" },
  { key: "performance", label: "Performance", href: "/admin/affiliate/performance" },
] as const;

export function AdminAffiliateTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            active === tab.key
              ? "bg-primary text-primary-foreground"
              : "border border-input bg-background hover:bg-white/[0.04]"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
