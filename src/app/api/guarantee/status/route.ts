import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeMonthlyStreak, computeWeeklyStreak } from "@/lib/gamification/streaks";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: txns }, { data: snaps }, { data: scores }] = await Promise.all([
    supabase.from("transactions").select("txn_date").eq("user_id", user.id),
    supabase.from("net_worth_snapshots").select("snapshot_date").eq("user_id", user.id),
    supabase
      .from("health_score_history")
      .select("score, recorded_at")
      .eq("user_id", user.id)
      .gte("recorded_at", ninetyDaysAgo)
      .order("recorded_at", { ascending: true }),
  ]);

  const { current: weeksLogged } = computeWeeklyStreak(
    (txns ?? []).map((t) => String(t.txn_date)),
    today,
  );
  const { current: snapshots } = computeMonthlyStreak(
    (snaps ?? []).map((s) => String(s.snapshot_date)),
    today,
  );

  const first = scores?.[0]?.score ?? null;
  const last = scores && scores.length > 0 ? scores[scores.length - 1].score : null;
  const scoreDelta = first != null && last != null ? last - first : null;
  const eligible = weeksLogged >= 13 && snapshots >= 3 && scoreDelta != null && scoreDelta <= 0;

  return NextResponse.json({
    weeksLogged,
    snapshots,
    scoreDelta,
    eligible,
  });
}
