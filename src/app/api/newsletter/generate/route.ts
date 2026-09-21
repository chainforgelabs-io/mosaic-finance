import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateAndSendNewsletter,
  generateNewsletter,
} from "@/lib/newsletter/generator";
import { captureAPIError } from "@/lib/sentry";

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("authorization");
    const isCron = cronSecret === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const sendEmails = body.send === true;

    if (sendEmails) {
      const result = await generateAndSendNewsletter(
        Array.isArray(body.emails) ? body.emails : undefined,
      );
      return NextResponse.json({
        message: "Newsletter generated and sent",
        ...result,
      });
    }

    const { id, content } = await generateNewsletter();
    return NextResponse.json({
      message: "Newsletter generated",
      id,
      preview: {
        weekStart: content.weekStart,
        weekEnd: content.weekEnd,
        recapLength: content.marketRecap.length,
        moversCount:
          content.topMovers.gainers.length + content.topMovers.losers.length,
      },
    });
  } catch (error) {
    captureAPIError(error, { route: "newsletter/generate" });
    return NextResponse.json(
      { error: "Unable to generate newsletter." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");

  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateAndSendNewsletter();
    return NextResponse.json({
      message: `Newsletter sent to ${result.sent} subscribers`,
      ...result,
    });
  } catch (error) {
    captureAPIError(error, { route: "newsletter/cron" });
    return NextResponse.json(
      { error: "Newsletter generation failed" },
      { status: 500 },
    );
  }
}
