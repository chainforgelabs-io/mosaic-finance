import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchTickers } from "@/lib/market-data/market-aggregator";
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

    const { success } = await ratelimit.marketSearch.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const query = request.nextUrl.searchParams.get("q");
    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchTickers(query);
    return NextResponse.json({ results });
  } catch (error) {
    captureAPIError(error, { route: "market/search" });
    return NextResponse.json(
      { error: "Search failed." },
      { status: 500 },
    );
  }
}
