import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCompanyProfile, getQuotes } from "@/lib/market-data/market-aggregator";
import { getCompanyNews } from "@/lib/market-data/finnhub";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.marketSearch.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { symbol } = await params;
    const today = new Date().toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .split("T")[0];

    const [profile, quotes, news] = await Promise.allSettled([
      getCompanyProfile(symbol),
      getQuotes([symbol]),
      getCompanyNews(symbol, monthAgo, today),
    ]);

    return NextResponse.json({
      profile: profile.status === "fulfilled" ? profile.value : null,
      quote: quotes.status === "fulfilled" ? quotes.value[0] || null : null,
      news: news.status === "fulfilled" ? news.value : [],
    });
  } catch (error) {
    captureAPIError(error, { route: "market/company" });
    return NextResponse.json(
      { error: "Unable to load company data." },
      { status: 500 },
    );
  }
}
