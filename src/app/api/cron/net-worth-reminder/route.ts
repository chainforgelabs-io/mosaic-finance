import { NextRequest, NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { mosaicButton, mosaicCard, mosaicEmailHtml } from "@/lib/email/chrome";
import { sendMosaicEmailEach } from "@/lib/email/send";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/config/profile-mappings";
import { normalizeEmail } from "@/lib/email/unsubscribe";
import { monthKey } from "@/lib/tracking/dates";
import {
  clampReminderDay,
  reminderDue,
  torontoDate,
} from "@/lib/tracking/net-worth-reminder";
import type { NotificationPreferences } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = torontoDate();
  const thisMonth = monthKey(today);
  const supabase = createServiceClient();

  const profileSelect = await supabase
    .from("user_profiles")
    .select("id, email, notification_preferences, net_worth_reminder_day, net_worth_reminder_sent_for");

  if (profileSelect.error) {
    if (/net_worth_reminder/i.test(profileSelect.error.message)) {
      return NextResponse.json({ skipped: true, reason: "missing_columns" });
    }
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }

  const { data: snaps } = await supabase
    .from("net_worth_snapshots")
    .select("user_id, snapshot_date")
    .gte("snapshot_date", `${thisMonth}-01`);

  const snappedThisMonth = new Set(
    (snaps ?? [])
      .filter((row) => monthKey(String(row.snapshot_date)) === thisMonth)
      .map((row) => row.user_id),
  );

  const due: { id: string; email: string }[] = [];
  const missingEmail: string[] = [];

  for (const row of profileSelect.data ?? []) {
    const prefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(row.notification_preferences as Partial<NotificationPreferences> | null),
    };
    if (prefs.net_worth_reminder === false) continue;
    if (row.net_worth_reminder_sent_for === thisMonth) continue;
    if (snappedThisMonth.has(row.id)) continue;
    if (
      !reminderDue({
        day: clampReminderDay(Number(row.net_worth_reminder_day ?? 1)),
        today,
        lastSnapshotDate: null,
      })
    ) {
      continue;
    }
    if (row.email) {
      due.push({ id: row.id, email: normalizeEmail(row.email as string) });
    } else {
      missingEmail.push(row.id);
    }
  }

  for (const id of missingEmail) {
    const { data } = await supabase.auth.admin.getUserById(id);
    const email = data.user?.email ? normalizeEmail(data.user.email) : null;
    if (!email) continue;
    due.push({ id, email });
    await supabase.from("user_profiles").update({ email }).eq("id", id);
  }

  if (due.length === 0) {
    return NextResponse.json({ sent: 0, month: thisMonth });
  }

  const result = await sendMosaicEmailEach(
    due.map((row) => row.email),
    (email) => ({
      subject: "Time for your monthly net worth check",
      list: "reminders",
      html: mosaicEmailHtml({
        email,
        list: "reminders",
        kicker: "Net worth",
        title: "Time for your monthly net worth check",
        preheader: "Update this month’s snapshot. Tracking, not advice.",
        bodyHtml: mosaicCard(
          "Save this month’s snapshot",
          `<p style="margin:0 0 12px;">It is the day you chose for a net worth check. Open Net Worth, update the values, and save this month’s snapshot.</p>
           <p style="margin:0 0 12px;">This is tracking, not advice.</p>
           ${mosaicButton(`${APP_URL}/dashboard/assets`, "Open Net Worth")}`,
        ),
      }),
    }),
  );

  const sentIds = due.map((row) => row.id);
  if (sentIds.length > 0) {
    await supabase
      .from("user_profiles")
      .update({ net_worth_reminder_sent_for: thisMonth })
      .in("id", sentIds);
  }

  return NextResponse.json({ ...result, month: thisMonth });
}
