"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  TrendingUp,
  Settings,
} from "lucide-react";
import { TierBadge } from "./TierBadge";
import type { Tier, PlanStatus } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  requiresDelivered?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Plan", href: "/dashboard/plan", icon: FileText },
  { label: "Walkthrough", href: "/dashboard/plan/walkthrough", icon: MessageCircle, requiresDelivered: true },
  { label: "Market Context", href: "/dashboard/market-context", icon: TrendingUp },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface AppSidebarProps {
  alias?: string;
  tier?: Tier;
  planStatus?: PlanStatus;
  planId?: string;
}

export function AppSidebar({ alias = "User", tier = "free", planStatus = "none", planId }: AppSidebarProps) {
  const pathname = usePathname();

  const resolveHref = (item: NavItem) => {
    if (item.label === "My Plan" && planId) return `/dashboard/plan/${planId}`;
    if (item.label === "Walkthrough" && planId) return `/dashboard/plan/${planId}/walkthrough`;
    return item.href;
  };

  const isActive = (item: NavItem) => {
    const href = resolveHref(item);
    if (item.label === "Dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 bg-[var(--slate-950)] flex-col z-40">
        <div className="p-6 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--emerald)] flex items-center justify-center">
              <span className="text-white font-[family-name:var(--font-display)] font-bold text-sm">F</span>
            </div>
            <span className="text-white font-[family-name:var(--font-display)] font-semibold text-lg">
              Finova
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const disabled = item.requiresDelivered && planStatus !== "delivered";
            const active = isActive(item);
            const href = resolveHref(item);
            const Icon = item.icon;

            if (disabled) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 cursor-not-allowed opacity-50"
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="font-[family-name:var(--font-display)] font-medium text-sm">
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
                  active
                    ? "text-white bg-white/5"
                    : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--emerald)] rounded-r" />
                )}
                <Icon className="w-[18px] h-[18px]" />
                <span className="font-[family-name:var(--font-display)] font-medium text-sm">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white font-[family-name:var(--font-display)] text-xs font-semibold">
                {alias.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{alias}</p>
              <TierBadge tier={tier} />
            </div>
          </div>
          {tier !== "premium" && (
            <Link
              href="/dashboard/settings"
              className="block text-center text-[var(--emerald)] text-xs font-medium hover:underline mt-1 mb-2"
            >
              Upgrade
            </Link>
          )}
        </div>

        <div className="px-4 pb-4">
          <p className="font-[family-name:var(--font-body)] text-[10px] text-gray-500 leading-tight">
            Plans reviewed by a CIM professional
          </p>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--slate-950)] border-t border-white/10 z-40 flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navItems.slice(0, 4).map((item) => {
          const disabled = item.requiresDelivered && planStatus !== "delivered";
          const active = isActive(item);
          const href = resolveHref(item);
          const Icon = item.icon;

          if (disabled) {
            return (
              <div key={item.label} className="flex flex-col items-center gap-0.5 opacity-30 px-3 py-1">
                <Icon className="w-5 h-5 text-gray-500" />
                <span className="text-[10px] text-gray-500">{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                active ? "text-white" : "text-gray-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-[var(--emerald)]" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
