import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACHIEVEMENT_BY_KEY,
  evaluateAchievements,
  type AchievementContext,
  type AchievementDef,
} from "@/lib/gamification/achievements";
import { computeMonthlyStreak, computeWeeklyStreak } from "@/lib/gamification/streaks";
import { todayIso } from "@/lib/tracking/dates";
import type { GamificationSummary } from "@/types/tracking";

interface AchievementRow {
  achievement_key: string;
  achieved_at: string;
}

export async function loadEarnedKeys(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ keys: Set<string>; rows: AchievementRow[] }> {
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_key, achieved_at")
    .eq("user_id", userId);

  const rows = (data ?? []) as AchievementRow[];
  return { keys: new Set(rows.map((r) => r.achievement_key)), rows };
}

export async function persistUnlocks(
  supabase: SupabaseClient,
  userId: string,
  unlocks: AchievementDef[],
): Promise<void> {
  if (unlocks.length === 0) return;
  await supabase.from("user_achievements").insert(
    unlocks.map((u) => ({
      user_id: userId,
      achievement_key: u.key,
    })),
  );
}

export async function buildAchievementContext(
  supabase: SupabaseClient,
  userId: string,
  extras: Partial<AchievementContext> = {},
): Promise<AchievementContext> {
  const [txnRes, snapRes, profileRes] = await Promise.all([
    supabase.from("transactions").select("txn_date").eq("user_id", userId),
    supabase
      .from("net_worth_snapshots")
      .select("snapshot_date, debts_total, net_worth")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false }),
    supabase
      .from("financial_profiles")
      .select("emergency_fund_months")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const txnDates = ((txnRes.data ?? []) as { txn_date: string }[]).map((t) => t.txn_date);
  const snapshots = (snapRes.data ?? []) as {
    snapshot_date: string;
    debts_total: number;
    net_worth: number;
  }[];
  const today = todayIso();
  const weekly = computeWeeklyStreak(txnDates, today);
  const monthly = computeMonthlyStreak(
    snapshots.map((s) => s.snapshot_date),
    today,
  );

  const latest = snapshots[0];
  const prior = snapshots[1];

  return {
    transactionCount: txnDates.length,
    weeklyStreak: weekly.current,
    snapshotCount: snapshots.length,
    monthlyStreak: monthly.current,
    netWorth: extras.netWorth ?? latest?.net_worth ?? null,
    priorDebtsTotal: extras.priorDebtsTotal ?? prior?.debts_total ?? null,
    currentDebtsTotal: extras.currentDebtsTotal ?? latest?.debts_total ?? null,
    emergencyFundMonths:
      extras.emergencyFundMonths ??
      (profileRes.data?.emergency_fund_months != null
        ? Number(profileRes.data.emergency_fund_months)
        : null),
    goalJustAchieved: extras.goalJustAchieved ?? false,
  };
}

export async function awardForEvent(
  supabase: SupabaseClient,
  userId: string,
  extras: Partial<AchievementContext> = {},
): Promise<AchievementDef[]> {
  const [{ keys }, ctx] = await Promise.all([
    loadEarnedKeys(supabase, userId),
    buildAchievementContext(supabase, userId, extras),
  ]);
  const unlocks = evaluateAchievements(ctx, keys);
  await persistUnlocks(supabase, userId, unlocks);
  return unlocks;
}

export async function getGamificationSummary(
  supabase: SupabaseClient,
  userId: string,
  newUnlocks: AchievementDef[] = [],
): Promise<GamificationSummary> {
  const [txnRes, snapRes, earned] = await Promise.all([
    supabase.from("transactions").select("txn_date").eq("user_id", userId),
    supabase
      .from("net_worth_snapshots")
      .select("snapshot_date")
      .eq("user_id", userId),
    loadEarnedKeys(supabase, userId),
  ]);

  const today = todayIso();
  const weekly = computeWeeklyStreak(
    ((txnRes.data ?? []) as { txn_date: string }[]).map((t) => t.txn_date),
    today,
  );
  const monthly = computeMonthlyStreak(
    ((snapRes.data ?? []) as { snapshot_date: string }[]).map((s) => s.snapshot_date),
    today,
  );

  const achievements = earned.rows
    .map((row) => {
      const def = ACHIEVEMENT_BY_KEY[row.achievement_key];
      if (!def) return null;
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        achieved_at: row.achieved_at,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a != null)
    .sort((a, b) => (a.achieved_at < b.achieved_at ? 1 : -1));

  return {
    weeklyStreak: weekly.current,
    monthlyStreak: monthly.current,
    loggedThisWeek: weekly.loggedThisWeek,
    snapshottedThisMonth: monthly.snapshottedThisMonth,
    achievements,
    newUnlocks: newUnlocks.map((u) => ({
      key: u.key,
      name: u.name,
      description: u.description,
    })),
  };
}
