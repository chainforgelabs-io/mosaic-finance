import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotes, DEFAULT_INDICES } from "@/lib/market-data/market-aggregator";
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

    const { success } = await ratelimit.marketQuotes.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const symbolsParam = request.nextUrl.searchParams.get("symbols");
    const symbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim())
      : DEFAULT_INDICES.map((i) => i.symbol);

    const quotes = await getQuotes(symbols);

    return NextResponse.json({ quotes });
  } catch (error) {
    captureAPIError(error, { route: "market/quotes" });
    return NextResponse.json(
      { error: "Unable to load market quotes." },
      { status: 500 },
    );
  }
}
