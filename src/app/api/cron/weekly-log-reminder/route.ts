import { NextRequest, NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { mosaicButton, mosaicCard, mosaicEmailHtml } from "@/lib/email/chrome";
import { sendMosaicEmailEach } from "@/lib/email/send";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/config/profile-mappings";
import { normalizeEmail } from "@/lib/email/unsubscribe";
import { addDays, startOfWeekMonday } from "@/lib/tracking/dates";
import { torontoDate } from "@/lib/tracking/net-worth-reminder";
import { weeklyLogReminderIds } from "@/lib/tracking/weekly-log-reminder";
import type { NotificationPreferences } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = torontoDate();
  const weekStart = startOfWeekMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const supabase = createServiceClient();

  const profileSelect = await supabase
    .from("user_profiles")
    .select("id, email, notification_preferences, weekly_log_reminder_sent_for");

  if (profileSelect.error) {
    if (/weekly_log_reminder_sent_for/i.test(profileSelect.error.message)) {
      return NextResponse.json({ skipped: true, reason: "missing_column" });
    }
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }

  const [txns, checks, baselines] = await Promise.all([
    supabase
      .from("transactions")
      .select("user_id")
      .gte("txn_date", weekStart)
      .lte("txn_date", weekEnd)
      .neq("source", "screenshot"),
    supabase.from("balance_checks").select("user_id").gte("check_date", weekStart).lte("check_date", weekEnd),
    supabase.from("spending_baselines").select("user_id, updated_at").gte("updated_at", `${weekStart}T00:00:00Z`),
  ]);

  if (txns.error || checks.error || baselines.error) {
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }

  const logged = new Set<string>();
  for (const row of txns.data ?? []) logged.add(row.user_id as string);
  for (const row of checks.data ?? []) logged.add(row.user_id as string);
  for (const row of baselines.data ?? []) {
    const updated = String(row.updated_at ?? "").slice(0, 10);
    if (updated >= weekStart && updated <= weekEnd) logged.add(row.user_id as string);
  }

  const dueIds = new Set(
    weeklyLogReminderIds(
      weekStart,
      (profileSelect.data ?? []).map((row) => {
        const prefs: NotificationPreferences = {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...(row.notification_preferences as Partial<NotificationPreferences> | null),
        };
        return {
          id: row.id as string,
          remindersOn: prefs.weekly_log_reminder !== false,
          sentFor: (row.weekly_log_reminder_sent_for as string | null) ?? null,
          loggedThisWeek: logged.has(row.id as string),
        };
      }),
    ),
  );

  const due: { id: string; email: string }[] = [];
  for (const row of profileSelect.data ?? []) {
    if (!dueIds.has(row.id as string)) continue;
    let email = row.email ? normalizeEmail(row.email as string) : null;
    if (!email) {
      const { data } = await supabase.auth.admin.getUserById(row.id as string);
      email = data.user?.email ? normalizeEmail(data.user.email) : null;
      if (email) await supabase.from("user_profiles").update({ email }).eq("id", row.id);
    }
    if (email) due.push({ id: row.id as string, email });
  }

  if (due.length === 0) {
    return NextResponse.json({ sent: 0, week: weekStart });
  }

  const result = await sendMosaicEmailEach(
    due.map((row) => row.email),
    (email) => ({
      subject: "Log this week's spending",
      list: "reminders" as const,
      html: mosaicEmailHtml({
        email,
        list: "reminders",
        kicker: "This week",
        title: "Log this week's spending",
        preheader: "A reminder to add this week's spending. No amounts in this email.",
        bodyHtml: mosaicCard(
          "This week is not logged yet",
          `<p style="margin:0 0 12px;">This week does not have a spending log yet. Open Cash Flow and add what you spent.</p>
           <p style="margin:0 0 12px;">This is tracking, not advice.</p>
           ${mosaicButton(`${APP_URL}/dashboard/cash-flow`, "Log this week")}`,
        ),
      }),
    }),
  );

  if (due.length > 0) {
    await supabase
      .from("user_profiles")
      .update({ weekly_log_reminder_sent_for: weekStart })
      .in(
        "id",
        due.map((row) => row.id),
      );
  }

  return NextResponse.json({ ...result, week: weekStart });
}
