"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/stores/admin-store";
import { LogOut, Shield } from "lucide-react";

export default function AdminApprovalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { reviewer, loadAdminData } = useAdminStore();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!reviewer) {
      loadAdminData();
    }
  }, [reviewer, loadAdminData]);

  useEffect(() => {
    if (reviewer) {
      if (reviewer.role !== "cim_reviewer") {
        router.replace("/dashboard");
      } else {
        setAuthorized(true);
      }
    }
  }, [reviewer, router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--emerald)] border-t-transparent rounded-full animate-spin" />
          <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
            Verifying reviewer access…
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
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--emerald)] flex items-center justify-center">
                <span className="font-[family-name:var(--font-display)] text-white text-xs font-bold">F</span>
              </div>
              <span className="font-[family-name:var(--font-display)] text-white font-semibold text-base">
                finova
              </span>
            </div>
            <div className="h-5 w-px bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[var(--emerald)]" />
              <span className="font-[family-name:var(--font-body)] font-medium text-[14px] text-[var(--text-muted)]">
                CIM Review Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-[family-name:var(--font-body)] text-sm text-white/80">
              {reviewer?.name}
            </span>
            <button
              onClick={() => router.replace("/login")}
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
