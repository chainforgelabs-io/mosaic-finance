import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { monthKey } from "@/lib/tracking/dates";
import {
  clampReminderDay,
  reminderDue,
  torontoDate,
} from "@/lib/tracking/net-worth-reminder";
import type { SetupStatus } from "@/lib/onboarding/setup-status";

function missingColumn(message: string | undefined): boolean {
  return /does not exist|schema cache|net_worth_reminder|reviewed_at/i.test(message ?? "");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = torontoDate();
  const thisMonth = monthKey(today);

  const [planRes, snapRes, goalsRes, profileRes] = await Promise.all([
    supabase
      .from("budget_plan_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("net_worth_snapshots")
      .select("snapshot_date")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: false })
      .limit(12),
    supabase.from("goals").select("id, source, reviewed_at").eq("user_id", user.id),
    supabase
      .from("user_profiles")
      .select("net_worth_reminder_day")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const snapshots = snapRes.data ?? [];
  const lastSnapshotDate = snapshots[0]?.snapshot_date
    ? String(snapshots[0].snapshot_date)
    : null;
  const snapshotThisMonth = snapshots.some(
    (row) => monthKey(String(row.snapshot_date)) === thisMonth,
  );

  const goals = missingColumn(goalsRes.error?.message) ? [] : (goalsRes.data ?? []);
  const factFindPending = goals.filter(
    (row) => row.source === "fact_find" && !row.reviewed_at,
  );

  const reminderDay = missingColumn(profileRes.error?.message)
    ? 1
    : clampReminderDay(Number(profileRes.data?.net_worth_reminder_day ?? 1));

  const status: SetupStatus = {
    planSet: (planRes.count ?? 0) > 0,
    snapshotEver: snapshots.length > 0,
    snapshotThisMonth,
    goalsCount: goals.length,
    goalsReviewed: factFindPending.length === 0,
    reminderDay,
    reminderDue: reminderDue({
      day: reminderDay,
      today,
      lastSnapshotDate,
    }),
  };

  return NextResponse.json(status);
}
