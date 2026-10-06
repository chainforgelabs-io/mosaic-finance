import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateDerivedHealthScore } from "@/lib/calculations/health-score";
import {
  computeMonthlyStreak,
  computeWeeklyStreak,
  loggingActivityDates,
} from "@/lib/gamification/streaks";

export async function recordDerivedHealthScore(
  supabase: SupabaseClient,
  userId: string,
) {
  const [
    { data: financial },
    { data: snapshots },
    { data: txns },
    { data: goals },
    { data: checks },
    { data: baseline },
  ] = await Promise.all([
    supabase
      .from("financial_profiles")
      .select("annual_income, monthly_expenses, emergency_fund_months, major_debts")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("net_worth_snapshots")
      .select("net_worth, snapshot_date")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .limit(12),
    supabase
      .from("transactions")
      .select("txn_date, source")
      .eq("user_id", userId)
      .neq("source", "screenshot")
      .order("txn_date", { ascending: false })
      .limit(200),
    supabase.from("goals").select("status").eq("user_id", userId),
    supabase.from("balance_checks").select("check_date").eq("user_id", userId),
    supabase.from("spending_baselines").select("updated_at").eq("user_id", userId).maybeSingle(),
  ]);

  const debts = Array.isArray(financial?.major_debts)
    ? (financial.major_debts as { amount?: number; balance?: number }[])
    : [];
  const totalDebt = debts.reduce(
    (sum, d) => sum + Number(d.amount ?? d.balance ?? 0),
    0,
  );

  const today = new Date().toISOString().slice(0, 10);
  const snapList = snapshots ?? [];
  const { current: monthlyStreak } = computeMonthlyStreak(
    snapList.map((s) => String(s.snapshot_date)),
    today,
  );
  const { current: weeklyStreak } = computeWeeklyStreak(
    loggingActivityDates({
      transactions: (txns ?? []) as { txn_date: string; source?: string | null }[],
      checkDates: ((checks ?? []) as { check_date: string }[]).map((c) => String(c.check_date)),
      baselineUpdatedAt: (baseline?.updated_at as string | null) ?? null,
    }),
    today,
  );

  const result = calculateDerivedHealthScore({
    annualIncome: financial?.annual_income != null ? Number(financial.annual_income) : null,
    monthlyExpenses:
      financial?.monthly_expenses != null ? Number(financial.monthly_expenses) : null,
    emergencyFundMonths:
      financial?.emergency_fund_months != null
        ? Number(financial.emergency_fund_months)
        : null,
    totalDebt: debts.length ? totalDebt : null,
    netWorth: snapList[0]?.net_worth != null ? Number(snapList[0].net_worth) : null,
    priorNetWorth: snapList[1]?.net_worth != null ? Number(snapList[1].net_worth) : null,
    weeklyStreak,
    monthlySnapshotStreak: monthlyStreak,
    activeGoals: (goals ?? []).filter((g) => g.status === "active").length,
    achievedGoals: (goals ?? []).filter((g) => g.status === "achieved").length,
  });

  await supabase.from("health_score_history").insert({
    user_id: userId,
    score: result.score,
    breakdown: result.breakdown,
    source: "derived",
  });

  return result;
}

export async function recordReportHealthScore(
  supabase: SupabaseClient,
  userId: string,
  score: number,
  breakdown: Record<string, unknown>,
) {
  await supabase.from("health_score_history").insert({
    user_id: userId,
    score: Math.max(0, Math.min(100, Math.round(score))),
    breakdown,
    source: "report",
  });
}
