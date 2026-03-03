"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  TrendingUp,
  Settings,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TierBadge } from "./TierBadge";

interface AppSidebarProps {
  userAlias: string;
  tier: "free" | "essential" | "pro" | "premium";
  planStatus?: string;
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiresPlan?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Plan", href: "/dashboard/plan", icon: FileText },
  { label: "Walkthrough", href: "/dashboard/plan/walkthrough", icon: MessageSquare, requiresPlan: true },
  { label: "Market Context", href: "/dashboard/market-context", icon: TrendingUp },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar({
  userAlias,
  tier,
  planStatus,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-60 flex-col bg-[var(--slate-950)]",
        "max-md:bottom-0 max-md:top-auto max-md:h-auto max-md:w-full max-md:flex-row max-md:items-center max-md:justify-around max-md:border-t max-md:border-white/10",
        "md:max-lg:w-14",
        className,
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-6 max-md:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--emerald)]">
          <span className="font-display text-sm font-bold text-white">F</span>
        </div>
        <span className="font-display text-sm font-semibold text-white md:max-lg:hidden">
          Finova
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 max-md:flex-row max-md:gap-0 max-md:px-0">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const isDisabled = item.requiresPlan && planStatus !== "delivered";

          if (isDisabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 opacity-40 max-md:flex-col max-md:gap-0.5 max-md:px-2 max-md:py-1.5"
                title="Available after plan delivery"
              >
                <item.icon className="size-[18px] text-[var(--text-muted)]" />
                <span className="font-display text-sm font-medium text-[var(--text-muted)] md:max-lg:hidden max-md:text-[10px]">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                "max-md:flex-col max-md:gap-0.5 max-md:px-2 max-md:py-1.5",
                isActive
                  ? "border-l-[3px] border-[var(--emerald)] bg-white/5 text-white max-md:border-l-0 max-md:border-t-[3px]"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className="size-[18px]" />
              <span className="font-display text-sm font-medium md:max-lg:hidden max-md:text-[10px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 px-4 py-4 max-md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/10">
            <span className="font-display text-xs font-semibold text-white">
              {userAlias.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col md:max-lg:hidden">
            <span className="font-display text-sm font-medium text-white">
              {userAlias}
            </span>
            <TierBadge tier={tier} className="mt-0.5 w-fit" />
          </div>
        </div>
        {tier !== "premium" && (
          <Link
            href="/dashboard/settings?tab=subscription"
            className="mt-3 flex items-center gap-1 font-display text-xs font-medium text-[var(--emerald)] transition-colors hover:text-[var(--emerald-dark)] md:max-lg:hidden"
          >
            Upgrade
            <ArrowUpRight className="size-3" />
          </Link>
        )}
      </div>

      {/* Compliance note */}
      <div className="px-4 pb-4 max-md:hidden md:max-lg:hidden">
        <p className="font-body text-[10px] leading-tight text-[var(--text-muted)]">
          Plans reviewed by a CIM professional
        </p>
      </div>
    </aside>
  );
}
