import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeMonthlyStreak,
  computeWeeklyStreak,
  loggingActivityDates,
} from "@/lib/gamification/streaks";
import { derivedScoreDelta, guaranteeEligible } from "@/lib/health-score/guarantee";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: txns }, { data: checks }, { data: baseline }, { data: snaps }, { data: scores }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("txn_date, source")
        .eq("user_id", user.id)
        .neq("source", "screenshot"),
      supabase.from("balance_checks").select("check_date").eq("user_id", user.id),
      supabase.from("spending_baselines").select("updated_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("net_worth_snapshots").select("snapshot_date").eq("user_id", user.id),
      supabase
        .from("health_score_history")
        .select("score, source, recorded_at")
        .eq("user_id", user.id)
        .gte("recorded_at", ninetyDaysAgo)
        .order("recorded_at", { ascending: true }),
    ]);

  // Same activity definition as the streak the user sees on the dashboard:
  // statement imports do not count, balance checks and confirmed pictures do.
  const { current: weeksLogged } = computeWeeklyStreak(
    loggingActivityDates({
      transactions: (txns ?? []) as { txn_date: string; source?: string | null }[],
      checkDates: ((checks ?? []) as { check_date: string }[]).map((c) => String(c.check_date)),
      baselineUpdatedAt: (baseline?.updated_at as string | null) ?? null,
    }),
    today,
  );
  const { current: snapshots } = computeMonthlyStreak(
    (snaps ?? []).map((s) => String(s.snapshot_date)),
    today,
  );

  const scoreDelta = derivedScoreDelta(
    (scores ?? []) as { score: number; source?: string | null; recorded_at: string }[],
  );
  const eligible = guaranteeEligible({ weeksLogged, snapshots, scoreDelta });

  return NextResponse.json({
    weeksLogged,
    snapshots,
    scoreDelta,
    eligible,
  });
}
