import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNurtureEmail } from "@/lib/resend/client";

const STEP_GAP_MS = 3 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - STEP_GAP_MS).toISOString();

  const { data: rows } = await supabase
    .from("waitlist_signups")
    .select("email, nurture_step, last_nurture_at, created_at")
    .lt("nurture_step", 5)
    .or(`last_nurture_at.is.null,last_nurture_at.lte.${cutoff}`)
    .limit(200);

  let sent = 0;
  for (const row of rows ?? []) {
    const last = row.last_nurture_at ?? row.created_at;
    if (last && new Date(last).getTime() > Date.now() - STEP_GAP_MS) continue;
    const nextStep = Math.max(1, Number(row.nurture_step ?? 0));
    if (nextStep >= 5) continue;
    try {
      await sendNurtureEmail(row.email, nextStep - 1);
      await supabase
        .from("waitlist_signups")
        .update({
          nurture_step: nextStep + 1,
          last_nurture_at: new Date().toISOString(),
        })
        .eq("email", row.email);
      sent += 1;
    } catch {
      /* keep going */
    }
  }

  return NextResponse.json({ sent });
}
