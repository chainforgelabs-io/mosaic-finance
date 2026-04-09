"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminStore } from "@/stores/admin-store";
import { LayoutDashboard, LogOut, Shield } from "lucide-react";
import { MosaicLogo } from "@/components/app/MosaicLogo";

export default function AdminApprovalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { reviewer, loadAdminData, isLoading, loadError } = useAdminStore();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (!isLoading && loadError === "Not signed in") {
      router.replace("/login");
    }
  }, [isLoading, loadError, router]);

  useEffect(() => {
    if (!isLoading && reviewer) {
      if (reviewer.role !== "admin") {
        router.replace("/dashboard");
      } else {
        setAuthorized(true);
      }
    }
  }, [isLoading, reviewer, router]);

  if (!isLoading && loadError && loadError !== "Not signed in") {
    return (
      <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center px-6">
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--error)]">
          {loadError}
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--emerald)] border-t-transparent rounded-full animate-spin" />
          <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
            Verifying advisor access…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--warm-50)]">
      <header className="bg-[var(--slate-950)] border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MosaicLogo size="sm" variant="onDark" />
            <div className="h-5 w-px bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[var(--emerald)]" />
              <span className="font-[family-name:var(--font-body)] font-medium text-[14px] text-[var(--text-muted)]">
                Advisor Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors font-[family-name:var(--font-body)] text-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">My Dashboard</span>
            </Link>
            <span className="font-[family-name:var(--font-body)] text-sm text-white/80 max-w-[140px] sm:max-w-none truncate">
              {reviewer?.name}
            </span>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/signout", { method: "POST" });
                router.replace("/login");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors font-[family-name:var(--font-body)] text-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
