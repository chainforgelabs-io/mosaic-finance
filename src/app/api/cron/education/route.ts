import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mosaicCard, mosaicEmailHtml } from "@/lib/email/chrome";
import { sendMosaicEmailEach } from "@/lib/email/send";
import { collectEducationRecipients } from "@/lib/email/recipients";
import {
  educationIssueForDate,
  isEducationWeek,
} from "@/lib/email/education";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  if (!isEducationWeek(now)) {
    return NextResponse.json({ skipped: true, reason: "odd_iso_week" });
  }

  const issue = educationIssueForDate(now);
  const recipients = await collectEducationRecipients();
  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, issue: issue.slug });
  }

  const result = await sendMosaicEmailEach(
    recipients.map((r) => r.email),
    (email) => ({
      subject: issue.subject,
      list: "education",
      html: mosaicEmailHtml({
        email,
        list: "education",
        kicker: issue.kicker,
        title: issue.title,
        preheader: issue.preheader,
        bodyHtml: mosaicCard("Read this in two minutes", issue.body(APP_URL)),
      }),
    }),
  );

  const supabase = createServiceClient();
  const stamped = now.toISOString();
  const userIds = recipients
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));
  if (userIds.length > 0) {
    await supabase
      .from("user_profiles")
      .update({ last_education_email_at: stamped })
      .in("id", userIds);
  }

  return NextResponse.json({ ...result, issue: issue.slug });
}
