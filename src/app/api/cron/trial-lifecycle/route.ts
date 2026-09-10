import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTrialDay10Email, sendTrialExpiredEmail } from "@/lib/resend/client";

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
    .select("id")
    .eq("subscription_tier", "pulse")
    .gt("trial_ends_at", now.toISOString())
    .lte("trial_ends_at", inFourDays.toISOString());

  const { data: expired } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("subscription_tier", "pulse")
    .gt("trial_ends_at", yesterday.toISOString())
    .lte("trial_ends_at", now.toISOString());

  let reminded = 0;
  let expiredCount = 0;

  for (const row of day10 ?? []) {
    const { data } = await supabase.auth.admin.getUserById(row.id);
    if (data.user?.email) {
      await sendTrialDay10Email(data.user.email).catch(() => undefined);
      reminded += 1;
    }
  }

  for (const row of expired ?? []) {
    const { data } = await supabase.auth.admin.getUserById(row.id);
    if (data.user?.email) {
      await sendTrialExpiredEmail(data.user.email).catch(() => undefined);
      expiredCount += 1;
    }
  }

  return NextResponse.json({ reminded, expired: expiredCount });
}
