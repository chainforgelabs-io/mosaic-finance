"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ComplianceFooter } from "@/components/app/ComplianceFooter";
import { usePlanStore } from "@/stores/plan-store";
import { createClient } from "@/lib/supabase/client";

const PROVINCE_CODE_TO_NAME: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NT: "Northwest Territories",
  NS: "Nova Scotia",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

const EMPLOYMENT_DB_TO_DISPLAY: Record<string, string> = {
  employed: "Employed",
  "self-employed": "Self-Employed",
  retired: "Retired",
  student: "Student",
};

const FAMILY_DB_TO_DISPLAY: Record<string, string> = {
  single: "Single",
  married: "Married",
  "common-law": "Common-Law",
  "single-parent": "Single Parent",
  family: "Family",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, planStatus, setUser, setPlanStatus } = usePlanStore();

  useEffect(() => {
    if (user) return;

    async function loadUser() {
      const supabase = createClient();

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("alias, subscription_tier, age, province, employment_type, family_structure")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        const rawProvince = profile.province ?? "";
        const rawEmployment = profile.employment_type ?? "";
        const rawFamily = profile.family_structure ?? "";

        setUser({
          id: authUser.id,
          alias: profile.alias ?? authUser.user_metadata?.alias ?? "User",
          tier: profile.subscription_tier ?? "free",
          age: profile.age ?? undefined,
          province: (PROVINCE_CODE_TO_NAME[rawProvince] ?? rawProvince) || undefined,
          employmentType: (EMPLOYMENT_DB_TO_DISPLAY[rawEmployment] ?? rawEmployment) || undefined,
          familyStructure: (FAMILY_DB_TO_DISPLAY[rawFamily] ?? rawFamily) || undefined,
        });
      } else {
        setUser({
          id: authUser.id,
          alias: authUser.user_metadata?.alias ?? "User",
          tier: "free",
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
  }, [user, setUser, setPlanStatus, router]);

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
