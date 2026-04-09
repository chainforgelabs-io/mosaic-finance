import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAndSendNewsletter, generateNewsletter } from "@/lib/newsletter/generator";
import { captureAPIError } from "@/lib/sentry";

export async function POST(request: NextRequest) {
  try {
    // Support both authenticated user triggers and Vercel Cron
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

      // Only admins can manually trigger
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

    if (sendEmails && body.emails?.length > 0) {
      const id = await generateAndSendNewsletter(body.emails);
      return NextResponse.json({
        message: "Newsletter generated and sent",
        id,
      });
    }

    // Generate without sending
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
        aiHighlightsCount: content.aiHighlights.length,
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

// Vercel Cron handler — runs weekly on Monday at 8am EST
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");

  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all subscribed user emails
    const supabase = createServiceClient();
    const { data: users } = await supabase
      .from("user_profiles")
      .select("email")
      .not("email", "is", null);

    const emails = (users || [])
      .map((u) => u.email as string)
      .filter(Boolean);

    if (emails.length === 0) {
      return NextResponse.json({ message: "No subscribers found" });
    }

    const id = await generateAndSendNewsletter(emails);
    return NextResponse.json({
      message: `Newsletter sent to ${emails.length} subscribers`,
      id,
    });
  } catch (error) {
    captureAPIError(error, { route: "newsletter/cron" });
    return NextResponse.json(
      { error: "Newsletter generation failed" },
      { status: 500 },
    );
  }
}
