"use client";

import { useEffect } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ComplianceFooter } from "@/components/app/ComplianceFooter";
import { usePlanStore } from "@/stores/plan-store";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, planStatus, setUser, setPlanStatus } = usePlanStore();

  useEffect(() => {
    if (user) return;

    async function loadUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("alias, subscription_tier")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser({
          id: authUser.id,
          alias: profile.alias,
          tier: profile.subscription_tier ?? "free",
        });
      }

      const { data: plan } = await supabase
        .from("financial_plans")
        .select("id, status")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (plan) {
        setPlanStatus(plan.status);
      } else {
        setPlanStatus("none");
      }
    }

    loadUser();
  }, [user, setUser, setPlanStatus]);

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
