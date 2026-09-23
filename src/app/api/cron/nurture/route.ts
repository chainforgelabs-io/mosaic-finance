import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendNurtureEmail,
  sendPrelaunchNurtureEmail,
} from "@/lib/resend/client";
import {
  loadAuthEmailSet,
  markWaitlistConverted,
} from "@/lib/email/recipients";
import { normalizeEmail } from "@/lib/email/unsubscribe";
import { isLaunchLive } from "@/lib/config/launch";
import {
  NURTURE_STEP_GAP_MS,
  planNurtureSend,
} from "@/lib/email/nurture-content";

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - NURTURE_STEP_GAP_MS).toISOString();
  const accounts = await loadAuthEmailSet();
  const live = isLaunchLive();

  const { data: rows } = await supabase
    .from("waitlist_signups")
    .select("email, nurture_step, last_nurture_at, created_at")
    .lt("nurture_step", 5)
    .is("unsubscribed_at", null)
    .is("converted_at", null)
    .or(`last_nurture_at.is.null,last_nurture_at.lte.${cutoff}`)
    .limit(200);

  let sent = 0;
  let held = 0;
  let skippedConverted = 0;
  for (const row of rows ?? []) {
    const email = normalizeEmail(row.email);
    if (accounts.has(email)) {
      await markWaitlistConverted(email);
      skippedConverted += 1;
      continue;
    }
    const plan = planNurtureSend({
      live,
      nurtureStep: Number(row.nurture_step ?? 1),
      createdAt: row.created_at,
      lastNurtureAt: row.last_nurture_at,
      now,
    });
    if (plan.action === "skip") continue;
    try {
      if (plan.action === "prelaunch") {
        await sendPrelaunchNurtureEmail(email, plan.issueIndex);
        await supabase
          .from("waitlist_signups")
          .update({ last_nurture_at: now.toISOString() })
          .eq("email", row.email);
        held += 1;
      } else {
        await sendNurtureEmail(email, plan.issueIndex);
        await supabase
          .from("waitlist_signups")
          .update({
            nurture_step: plan.nextStep,
            last_nurture_at: now.toISOString(),
          })
          .eq("email", row.email);
        sent += 1;
      }
    } catch {
      /* keep going */
    }
  }

  return NextResponse.json({ sent, held, skippedConverted, live });
}
