"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  TrendingUp,
  Settings,
  ArrowUpRight,
  LogOut,
  Video,
  Wallet,
  Shield,
  Banknote,
  Target,
  MoreHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TierBadge } from "./TierBadge";
import { MosaicLogo } from "./MosaicLogo";

type AppUserRole = "user" | "admin" | null | undefined;

interface AppSidebarProps {
  userAlias: string;
  tier: "snapshot" | "plan" | "advisor";
  planStatus?: string;
  planId?: string;
  role?: AppUserRole;
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiresPlan?: boolean;
  match?: "exact" | "prefix" | "walkthrough";
}

function trackItems(): NavItem[] {
  return [
    { label: "Cash Flow", href: "/dashboard/cash-flow", icon: Banknote },
    { label: "Net Worth", href: "/dashboard/assets", icon: Wallet },
    { label: "Goals", href: "/dashboard/goals", icon: Target },
  ];
}

function learnItems(planId?: string): NavItem[] {
  return [
    { label: "Progress Report", href: "/dashboard/plan", icon: FileText },
    {
      label: "Walkthrough",
      href: planId ? `/dashboard/plan/${planId}/walkthrough` : "/dashboard/plan",
      icon: MessageSquare,
      requiresPlan: true,
      match: "walkthrough",
    },
    { label: "Check-in", href: "/dashboard/meeting", icon: Video },
    { label: "Market Context", href: "/dashboard/market-context", icon: TrendingUp },
  ];
}

function isReviewerRole(role: AppUserRole): boolean {
  return role === "admin";
}

function itemActive(pathname: string, item: NavItem): boolean {
  if (item.match === "walkthrough") return pathname.includes("/walkthrough");
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.href === "/dashboard/plan" && pathname.includes("/walkthrough")) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppSidebar({
  userAlias,
  tier,
  planStatus,
  planId,
  role,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const showReviewQueue = isReviewerRole(role);
  const reviewQueueActive = pathname.startsWith("/admin");
  const track = trackItems();
  const learn = learnItems(planId);
  const moreItems: NavItem[] = [
    ...learn,
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];
  const moreActive = moreItems.some((item) => itemActive(pathname, item)) || reviewQueueActive;

  const mobilePrimary: NavItem[] = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard, match: "exact" },
    ...track,
  ];

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  }

  function renderLink(item: NavItem, opts?: { mobile?: boolean }) {
    const isActive = itemActive(pathname, item);
    const isDisabled = item.requiresPlan && planStatus !== "delivered";
    const mobile = opts?.mobile;

    if (isDisabled) {
      return (
        <div
          key={item.label}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 opacity-40",
            mobile && "flex-col gap-0.5 px-2 py-1.5",
          )}
          title="Available after your Progress Report is ready"
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
        key={item.label}
        href={item.href}
        onClick={() => setMoreOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          mobile && "flex-col gap-0.5 px-2 py-1.5",
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
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-60 flex-col bg-[var(--slate-950)]",
        "max-md:bottom-0 max-md:top-auto max-md:h-auto max-md:w-full max-md:flex-row max-md:items-center max-md:justify-around max-md:border-t max-md:border-white/10",
        "md:max-lg:w-14",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-5 py-6 max-md:hidden">
        <MosaicLogo size="sm" variant="onDark" collapseToEmblem />
      </div>

      {/* Desktop / tablet grouped nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 max-md:hidden">
        {renderLink({ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, match: "exact" })}
        <p className="mt-3 px-3 font-display text-[10px] font-semibold uppercase tracking-wider text-white/30 md:max-lg:hidden">
          Track
        </p>
        {track.map((item) => renderLink(item))}
        <p className="mt-3 px-3 font-display text-[10px] font-semibold uppercase tracking-wider text-white/30 md:max-lg:hidden">
          Learn
        </p>
        {learn.map((item) => renderLink(item))}
        {renderLink({ label: "Settings", href: "/dashboard/settings", icon: Settings })}
        {showReviewQueue && (
          <Link
            href="/admin/approval-queue"
            className={cn(
              "mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
              "border border-[var(--emerald)]/40 bg-[var(--emerald)]/10",
              reviewQueueActive
                ? "border-[var(--emerald)] text-white"
                : "text-[var(--emerald)] hover:bg-[var(--emerald)]/15",
            )}
          >
            <Shield className="size-[18px] shrink-0" />
            <span className="font-display text-sm font-medium md:max-lg:hidden">QA Queue</span>
          </Link>
        )}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="hidden max-md:flex max-md:w-full max-md:items-center max-md:justify-around">
        {mobilePrimary.map((item) => renderLink(item, { mobile: true }))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5",
            moreActive ? "border-t-[3px] border-[var(--emerald)] text-white" : "text-[var(--text-muted)]",
          )}
        >
          <MoreHorizontal className="size-[18px]" />
          <span className="font-display text-[10px] font-medium">More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-[var(--slate-950)] px-4 pb-8 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-white">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="size-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {moreItems.map((item) => {
                const isActive = itemActive(pathname, item);
                const isDisabled = item.requiresPlan && planStatus !== "delivered";
                if (isDisabled) {
                  return (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg px-3 py-3 opacity-40">
                      <item.icon className="size-5 text-[var(--text-muted)]" />
                      <span className="font-display text-sm text-[var(--text-muted)]">{item.label}</span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3",
                      isActive ? "bg-white/10 text-white" : "text-[var(--text-muted)]",
                    )}
                  >
                    <item.icon className="size-5" />
                    <span className="font-display text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {showReviewQueue && (
                <Link
                  href="/admin/approval-queue"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-[var(--emerald)]"
                >
                  <Shield className="size-5" />
                  <span className="font-display text-sm font-medium">QA Queue</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 flex items-center gap-3 rounded-lg px-3 py-3 text-[var(--text-muted)]"
              >
                <LogOut className="size-5" />
                <span className="font-display text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 px-4 py-4 max-md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/10">
            <span className="font-display text-xs font-semibold text-white">
              {userAlias.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col md:max-lg:hidden">
            <span className="font-display text-sm font-medium text-white">{userAlias}</span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <TierBadge tier={tier} className="w-fit" />
              {role === "admin" && (
                <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-wide text-[var(--emerald)]">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
        {tier !== "advisor" && (
          <Link
            href="/dashboard/settings?tab=subscription"
            className="mt-3 flex items-center gap-1 font-display text-xs font-medium text-[var(--emerald)] transition-colors hover:text-[var(--emerald-dark)] md:max-lg:hidden"
          >
            Upgrade
            <ArrowUpRight className="size-3" />
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 font-display text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-white md:max-lg:justify-center"
        >
          <LogOut className="size-3.5" />
          <span className="md:max-lg:hidden">Sign Out</span>
        </button>
      </div>

      <div className="px-4 pb-4 max-md:hidden md:max-lg:hidden">
        <p className="font-body text-[10px] leading-tight text-[var(--text-muted)]">
          Educational information, not financial advice. Speak with a licensed advisor before implementing changes.
        </p>
      </div>
    </aside>
  );
}
