import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordDerivedHealthScore } from "@/lib/health-score/record";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: latest } = await supabase
    .from("health_score_history")
    .select("score, breakdown, source, recorded_at")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: older } = await supabase
    .from("health_score_history")
    .select("score")
    .eq("user_id", user.id)
    .lte("recorded_at", ninetyDaysAgo)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let score = latest?.score ?? null;
  let breakdown = latest?.breakdown ?? null;

  if (score == null) {
    const derived = await recordDerivedHealthScore(supabase, user.id);
    score = derived.score;
    breakdown = derived.breakdown;
  }

  const delta = older?.score != null && score != null ? score - older.score : null;

  return NextResponse.json({
    score,
    breakdown,
    source: latest?.source ?? "derived",
    recordedAt: latest?.recorded_at ?? null,
    delta90: delta,
  });
}
