import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAggregatedNews } from "@/lib/market-data/market-aggregator";
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

    const { success } = await ratelimit.marketNews.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const category = request.nextUrl.searchParams.get("category") || undefined;
    const articles = await getAggregatedNews(category);

    return NextResponse.json({ articles });
  } catch (error) {
    captureAPIError(error, { route: "market/news" });
    return NextResponse.json(
      { error: "Unable to load news." },
      { status: 500 },
    );
  }
}
