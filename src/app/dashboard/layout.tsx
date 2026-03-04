"use client";

import { useEffect } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ComplianceFooter } from "@/components/app/ComplianceFooter";
import { usePlanStore } from "@/stores/plan-store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, plan, planStatus, loadMockData } = usePlanStore();

  useEffect(() => {
    if (!user) {
      loadMockData("delivered");
    }
  }, [user, loadMockData]);

  return (
    <div className="min-h-screen bg-[var(--warm-50)]">
      <AppSidebar
        userAlias={user?.alias ?? "User"}
        tier={user?.tier ?? "free"}
        planStatus={planStatus}
      />
      <main className="md:pl-60 min-h-screen flex flex-col pb-16 md:pb-0">
        <div className="flex-1 max-w-[1080px] w-full mx-auto px-6 py-8">
          {children}
        </div>
        <ComplianceFooter />
      </main>
    </div>
  );
}
