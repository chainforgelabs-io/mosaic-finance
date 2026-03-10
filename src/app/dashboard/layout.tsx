"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ComplianceFooter } from "@/components/app/ComplianceFooter";
import { usePlanStore } from "@/stores/plan-store";
import { createClient } from "@/lib/supabase/client";
import type { FinancialPlan, PlanStatus, PlanSection } from "@/types";

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

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function transformPlanData(
  dbPlan: { id: string; status: string; plan_data: any; created_at: string },
): FinancialPlan {
  const raw = typeof dbPlan.plan_data === "string"
    ? JSON.parse(dbPlan.plan_data)
    : dbPlan.plan_data ?? {};

  const diag = raw.financial_health_diagnostic;
  const ret = raw.retirement_readiness;

  const healthScore = diag?.financial_health_score ?? 0;
  const netWorth = diag?.net_worth != null ? fmt(diag.net_worth) : ret?.current_trajectory != null ? fmt(ret.current_trajectory) : "--";
  const monthlyCashFlow = diag?.cash_flow_monthly != null ? fmt(diag.cash_flow_monthly) : "--";
  const savingsRate = diag?.savings_rate_percent != null ? `${diag.savings_rate_percent}%` : "--";
  const retirementGap = ret ? fmt(ret.retirement_number - ret.current_trajectory) : "--";

  const sections: PlanSection[] = [];
  const sectionMap: Record<string, string> = {
    financial_health_diagnostic: "Financial Health",
    retirement_readiness: "Retirement Readiness",
    investment_portfolio_blueprint: "Investment Portfolio",
    tax_efficiency_review: "Tax Efficiency",
    debt_elimination_plan: "Debt Elimination",
    insurance_coverage_audit: "Insurance Coverage",
    market_context_report: "Market Context",
    lifetime_financial_roadmap: "Financial Roadmap",
  };

  for (const [key, title] of Object.entries(sectionMap)) {
    const sectionData = raw[key];
    if (!sectionData) continue;

    const actionItems = (sectionData.action_items ?? []).map((text: string, i: number) => ({
      id: `${key}-${i}`,
      text,
      priority: i === 0 ? "high" as const : "medium" as const,
    }));

    sections.push({
      id: key,
      title,
      status: "ai_generated",
      summary: sectionData.gap_analysis ?? sectionData.recommendation_rationale ?? sectionData.macro_environment ?? sectionData.decade_by_decade_summary ?? "",
      cards: [],
      prose: "",
      actionItems,
    });
  }

  return {
    id: dbPlan.id,
    userId: "",
    status: dbPlan.status as PlanStatus,
    healthScore,
    riskLabel: "Balanced",
    createdAt: dbPlan.created_at,
    estimatedDelivery: dbPlan.status === "pending_review" ? "Within 24 hours" : undefined,
    sections,
    netWorth,
    monthlyCashFlow,
    savingsRate,
    retirementGap,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, planStatus, setUser, clearUser, setPlan, setPlanStatus } = usePlanStore();

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

      const planRes = await fetch("/api/plan/latest", { credentials: "include" });
      if (planRes.status === 401) {
        clearUser();
        router.replace("/login");
        return;
      }
      if (planRes.ok) {
        const { plan: dbPlan } = await planRes.json();
        if (dbPlan && dbPlan.plan_data) {
          setPlan(transformPlanData(dbPlan));
        } else if (dbPlan) {
          setPlanStatus(dbPlan.status);
        } else {
          setPlanStatus("none");
        }
      } else {
        setPlanStatus("none");
      }
    }

    loadUser();
  }, [user, setUser, clearUser, setPlan, setPlanStatus, router]);

  const POLL_INTERVAL_MS = 10_000;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollPlanStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/plan/latest", { credentials: "include" });
      if (res.status === 401) return;
      if (!res.ok) return;
      const { plan } = await res.json();
      if (plan && plan.status !== "generating") {
        setPlanStatus(plan.status);
      }
    } catch {
      // Ignore network errors, poll again
    }
  }, [setPlanStatus]);

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
