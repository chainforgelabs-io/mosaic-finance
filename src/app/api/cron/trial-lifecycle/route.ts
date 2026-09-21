import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTrialDay10Email, sendTrialExpiredEmail } from "@/lib/resend/client";
import {
  optedOutOfMarketing,
  shouldSendTrialDay10,
  shouldSendTrialExpired,
} from "@/lib/email/trial";

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const inFourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: day10 } = await supabase
    .from("user_profiles")
    .select("id, email, trial_ends_at, trial_day10_emailed_at, subscription_tier, notification_preferences")
    .eq("subscription_tier", "pulse")
    .is("trial_day10_emailed_at", null)
    .gt("trial_ends_at", now.toISOString())
    .lte("trial_ends_at", inFourDays.toISOString());

  const { data: expired } = await supabase
    .from("user_profiles")
    .select("id, email, trial_ends_at, trial_expired_emailed_at, subscription_tier, notification_preferences")
    .eq("subscription_tier", "pulse")
    .is("trial_expired_emailed_at", null)
    .gt("trial_ends_at", yesterday.toISOString())
    .lte("trial_ends_at", now.toISOString());

  let reminded = 0;
  let expiredCount = 0;

  for (const row of day10 ?? []) {
    if (
      optedOutOfMarketing(
        row.notification_preferences as {
          weekly_market?: boolean;
          education_emails?: boolean;
        } | null,
      )
    ) {
      continue;
    }
    if (
      !shouldSendTrialDay10({
        subscriptionTier: row.subscription_tier as string,
        trialEndsAt: row.trial_ends_at as string | null,
        alreadySentAt: row.trial_day10_emailed_at as string | null,
        now,
      })
    ) {
      continue;
    }
    let email = row.email as string | null;
    if (!email) {
      const { data } = await supabase.auth.admin.getUserById(row.id);
      email = data.user?.email ?? null;
      if (email) {
        await supabase.from("user_profiles").update({ email }).eq("id", row.id);
      }
    }
    if (!email) continue;
    await sendTrialDay10Email(email, row.trial_ends_at as string).catch(
      () => undefined,
    );
    await supabase
      .from("user_profiles")
      .update({ trial_day10_emailed_at: now.toISOString() })
      .eq("id", row.id);
    reminded += 1;
  }

  for (const row of expired ?? []) {
    if (
      optedOutOfMarketing(
        row.notification_preferences as {
          weekly_market?: boolean;
          education_emails?: boolean;
        } | null,
      )
    ) {
      continue;
    }
    if (
      !shouldSendTrialExpired({
        subscriptionTier: row.subscription_tier as string,
        trialEndsAt: row.trial_ends_at as string | null,
        alreadySentAt: row.trial_expired_emailed_at as string | null,
        now,
      })
    ) {
      continue;
    }
    let email = row.email as string | null;
    if (!email) {
      const { data } = await supabase.auth.admin.getUserById(row.id);
      email = data.user?.email ?? null;
      if (email) {
        await supabase.from("user_profiles").update({ email }).eq("id", row.id);
      }
    }
    if (!email) continue;
    await sendTrialExpiredEmail(email).catch(() => undefined);
    await supabase
      .from("user_profiles")
      .update({ trial_expired_emailed_at: now.toISOString() })
      .eq("id", row.id);
    expiredCount += 1;
  }

  return NextResponse.json({ reminded, expired: expiredCount });
}
