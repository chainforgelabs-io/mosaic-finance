import type { SupabaseClient } from "@supabase/supabase-js";
import { loopEventsForLog, secondsSinceSignup, type LoopEvent } from "@/lib/analytics/loop-events";
import { loggingActivityDates } from "@/lib/gamification/streaks";

/**
 * Product events. User id and numeric counts only.
 * No amounts, names, emails, or free text.
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is unset.
 */
export async function captureLoopEvent(
  userId: string,
  event: LoopEvent,
  properties?: Record<string, number>,
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key || !userId) return;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com").replace(/\/$/, "");
  const safe: Record<string, number> = {};
  for (const [name, value] of Object.entries(properties ?? {})) {
    if (typeof value === "number" && Number.isFinite(value)) safe[name] = value;
  }
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: userId,
        properties: { ...safe, $process_person_profile: false },
      }),
    });
  } catch {
    // A missed event must not fail the user's action.
  }
}

export async function planLoggingMilestones(
  supabase: SupabaseClient,
  userId: string,
  loggedOn: string,
): Promise<{ events: Array<"first_log" | "log_week_2">; secondsSinceSignup: number }> {
  try {
  const [txns, checks, baseline, profile] = await Promise.all([
    supabase
      .from("transactions")
      .select("txn_date, source")
      .eq("user_id", userId)
      .neq("source", "screenshot"),
    supabase.from("balance_checks").select("check_date").eq("user_id", userId),
    supabase.from("spending_baselines").select("updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("user_profiles").select("created_at").eq("id", userId).maybeSingle(),
  ]);

  const priorLogDates = loggingActivityDates({
    transactions: (txns.data ?? []) as { txn_date: string; source?: string | null }[],
    checkDates: ((checks.data ?? []) as { check_date: string }[]).map((row) => String(row.check_date)),
    baselineUpdatedAt: (baseline.data?.updated_at as string | null) ?? null,
  });
  const signupAt = (profile.data?.created_at as string | null) ?? new Date().toISOString();
  return {
    events: loopEventsForLog({
      signupOn: signupAt.slice(0, 10),
      loggedOn,
      priorLogDates,
    }),
    secondsSinceSignup: secondsSinceSignup(signupAt, new Date()),
  };
  } catch {
    return { events: [], secondsSinceSignup: 0 };
  }
}

/** Send a plan computed before the new rows were inserted. */
export async function emitLoggingMilestones(
  userId: string,
  plan: { events: Array<"first_log" | "log_week_2">; secondsSinceSignup: number },
): Promise<void> {
  for (const event of plan.events) {
    await captureLoopEvent(
      userId,
      event,
      event === "first_log" ? { seconds_since_signup: plan.secondsSinceSignup } : undefined,
    );
  }
}
