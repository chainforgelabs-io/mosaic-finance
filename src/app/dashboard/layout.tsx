"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ComplianceFooter } from "@/components/app/ComplianceFooter";
import { usePlanStore } from "@/stores/plan-store";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  EMPLOYMENT_DB_TO_DISPLAY,
  FAMILY_DB_TO_DISPLAY,
  PROVINCE_CODE_TO_NAME,
} from "@/lib/config/profile-mappings";
import type { FinancialPlan, PlanStatus, NotificationPreferences } from "@/types";
import { transformDbPlanToFinancialPlan } from "@/lib/plan/transform-db-plan";

function applyLatestPlanFromDb(
  dbPlan: { id: string; status: string; plan_data: unknown; created_at: string } | null | undefined,
  setPlan: (plan: FinancialPlan) => void,
  setPlanStatus: (status: PlanStatus) => void,
  setRawPlanData: (data: Record<string, unknown>) => void,
) {
  if (dbPlan && dbPlan.plan_data) {
    const parsed =
      typeof dbPlan.plan_data === "string" ? JSON.parse(dbPlan.plan_data) : dbPlan.plan_data;
    setRawPlanData(parsed as Record<string, unknown>);
    setPlan(transformDbPlanToFinancialPlan(dbPlan));
  } else if (dbPlan) {
    setPlanStatus(dbPlan.status as PlanStatus);
  } else {
    setPlanStatus("none");
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, plan, planStatus, setUser, clearUser, setPlan, setPlanStatus, setRawPlanData, setPrePlanData } = usePlanStore();

  useEffect(() => {
    if (user) return;

    async function loadUser() {
      const supabase = createClient();

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        clearUser();
        router.replace("/login");
        return;
      }

      let { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        authUser = refreshData?.user ?? null;
      }
      if (!authUser) {
        clearUser();
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select(
          "alias, subscription_tier, age, province, employment_type, family_structure, notification_preferences, role",
        )
        .eq("id", authUser.id)
        .single();

      if (profile) {
        const rawProvince = profile.province ?? "";
        const rawEmployment = profile.employment_type ?? "";
        const rawFamily = profile.family_structure ?? "";
        const rawNotifs = profile.notification_preferences as
          | Partial<NotificationPreferences>
          | null
          | undefined;

        setUser({
          id: authUser.id,
          alias: profile.alias ?? authUser.user_metadata?.alias ?? "User",
          tier: profile.subscription_tier ?? "snapshot",
          age: profile.age ?? undefined,
          province: (PROVINCE_CODE_TO_NAME[rawProvince] ?? rawProvince) || undefined,
          employmentType: (EMPLOYMENT_DB_TO_DISPLAY[rawEmployment] ?? rawEmployment) || undefined,
          familyStructure: (FAMILY_DB_TO_DISPLAY[rawFamily] ?? rawFamily) || undefined,
          role:
            profile.role === "admin"
              ? profile.role
              : "user",
          notificationPreferences: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...rawNotifs,
          },
        });
      } else {
        setUser({
          id: authUser.id,
          alias: authUser.user_metadata?.alias ?? "User",
          tier: "snapshot",
          notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
        });
      }

      const planRes = await fetch("/api/plan/latest", { credentials: "include" });
      if (planRes.status === 401) {
        clearUser();
        router.replace("/login");
        return;
      }
      if (planRes.ok) {
        const { plan: dbPlan } = await planRes.json();
        applyLatestPlanFromDb(dbPlan, setPlan, setPlanStatus, setRawPlanData);
      } else {
        setPlanStatus("none");
      }

    }

    loadUser();
  }, [user, setUser, clearUser, setPlan, setPlanStatus, setRawPlanData, router]);

  useEffect(() => {
    if (!user) return;
    if (!pathname.startsWith("/dashboard")) return;

    let cancelled = false;
    async function refreshPlanFromServer() {
      const planRes = await fetch("/api/plan/latest", { credentials: "include" });
      if (cancelled) return;
      if (planRes.status === 401) {
        clearUser();
        router.replace("/login");
        return;
      }
      if (planRes.ok) {
        const { plan: dbPlan } = await planRes.json();
        applyLatestPlanFromDb(dbPlan, setPlan, setPlanStatus, setRawPlanData);
      }
    }

    refreshPlanFromServer();
    return () => {
      cancelled = true;
    };
  }, [user, pathname, setPlan, setPlanStatus, setRawPlanData, clearUser, router]);

  useEffect(() => {
    const { prePlanData } = usePlanStore.getState();
    if (!user || prePlanData) return;

    async function loadPrePlanData() {
      const supabase = createClient();
      const { data: fp } = await supabase
        .from("financial_profiles")
        .select("annual_income, monthly_expenses, emergency_fund_months, major_debts, retirement_target_age")
        .eq("user_id", user!.id)
        .single();

      const { data: holdings } = await supabase
        .from("investment_holdings")
        .select("total_value")
        .eq("user_id", user!.id);

      const { data: fixedAssets } = await supabase
        .from("fixed_assets")
        .select("estimated_value")
        .eq("user_id", user!.id);

      const totalFixedAssets =
        fixedAssets && fixedAssets.length > 0
          ? fixedAssets.reduce((sum, a) => sum + (Number(a.estimated_value) || 0), 0)
          : null;

      const majorDebts = fp?.major_debts as
        | { amount?: number; balance?: number }[]
        | null
        | undefined;
      const totalDebtFromProfile =
        Array.isArray(majorDebts) && majorDebts.length > 0
          ? majorDebts.reduce(
              (s, row) =>
                s + (Number(row.amount ?? row.balance ?? 0) || 0),
              0,
            )
          : null;

      if (fp || (holdings && holdings.length > 0) || (fixedAssets && fixedAssets.length > 0)) {
        const totalInv =
          holdings && holdings.length > 0
            ? holdings.reduce((sum, h) => sum + (Number(h.total_value) || 0), 0)
            : null;
        setPrePlanData({
          annualIncome: fp?.annual_income ?? null,
          monthlyExpenses: fp?.monthly_expenses ?? null,
          emergencyFundMonths: fp?.emergency_fund_months ?? null,
          totalInvestments: totalInv,
          totalFixedAssets,
          totalDebt: totalDebtFromProfile,
          retirementAge: fp?.retirement_target_age ?? null,
        });
      }
    }

    loadPrePlanData();
  }, [user, setPrePlanData]);

  const POLL_INTERVAL_MS = 15_000;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollPlanStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/plan/latest", { credentials: "include" });
      if (res.status === 401) return;
      if (!res.ok) return;
      const { plan: latestPlan } = await res.json();
      if (!latestPlan) {
        setPlanStatus("failed");
        return;
      }
      if (latestPlan.status !== "generating") {
        if (latestPlan.plan_data && Object.keys(latestPlan.plan_data).length > 0) {
          setRawPlanData(latestPlan.plan_data);
          setPlan(transformDbPlanToFinancialPlan(latestPlan));
        } else {
          setPlanStatus(latestPlan.status);
        }
      }
    } catch {
      // Ignore network errors, poll again
    }
  }, [setPlanStatus, setPlan, setRawPlanData]);

  useEffect(() => {
    if (planStatus !== "generating") return;
    pollRef.current = setInterval(pollPlanStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [planStatus, pollPlanStatus]);

  return (
    <div className="min-h-screen bg-[var(--warm-50)]">
      <AppSidebar
        userAlias={user?.alias ?? "User"}
        tier={user?.tier ?? "snapshot"}
        planStatus={planStatus}
        planId={plan?.id}
        role={user?.role}
      />
      <main className="md:pl-60 flex min-h-screen flex-col pb-20 md:pb-0">
        <div className="mx-auto flex w-full max-w-[1080px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
        <ComplianceFooter />
      </main>
    </div>
  );
}
