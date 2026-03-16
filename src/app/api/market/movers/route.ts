import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketMovers } from "@/lib/market-data/market-aggregator";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.marketQuotes.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const movers = await getMarketMovers();
    return NextResponse.json(movers);
  } catch (error) {
    captureAPIError(error, { route: "market/movers" });
    return NextResponse.json(
      { error: "Unable to load market movers." },
      { status: 500 },
    );
  }
}
