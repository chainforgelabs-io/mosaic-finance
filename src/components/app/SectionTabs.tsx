"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SectionTab {
  label: string;
  href: string;
  /** "exact" matches only the href itself; "prefix" also matches nested routes. */
  match?: "exact" | "prefix";
}

/** Horizontal pill tabs for sub-pages of one dashboard section. */
export function SectionTabs({ tabs, ariaLabel }: { tabs: SectionTab[]; ariaLabel: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={ariaLabel} className="-mx-1 overflow-x-auto px-1">
      <div className="inline-flex min-w-full gap-1 rounded-full border border-[var(--warm-200)] bg-white p-1 sm:min-w-0">
        {tabs.map((tab) => {
          const active =
            tab.match === "prefix" ? pathname.startsWith(tab.href) : pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 whitespace-nowrap rounded-full px-4 py-1.5 text-center font-display text-sm font-semibold transition-colors",
                active
                  ? "bg-[var(--slate-950)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--warm-100)]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
