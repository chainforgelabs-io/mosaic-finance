import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketSentiment, getTickerSentiment } from "@/lib/grok/x-search";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.marketSocial.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const ticker = request.nextUrl.searchParams.get("ticker");

    const sentiment = ticker
      ? await getTickerSentiment(ticker)
      : await getMarketSentiment();

    return NextResponse.json({ sentiment });
  } catch (error) {
    captureAPIError(error, { route: "market/social" });
    return NextResponse.json(
      { error: "Unable to load social sentiment." },
      { status: 500 },
    );
  }
}
