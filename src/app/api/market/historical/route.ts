import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHistoricalPrices } from "@/lib/market-data/market-aggregator";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import type { Timeframe } from "@/lib/market-data/types";

function getDateRange(timeframe: Timeframe): { from: string; to: string } {
  const to = new Date();
  const from = new Date();

  switch (timeframe) {
    case "1D":
      from.setDate(from.getDate() - 5); // extra days for trading day coverage
      break;
    case "1W":
      from.setDate(from.getDate() - 10);
      break;
    case "1M":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3M":
      from.setMonth(from.getMonth() - 3);
      break;
    case "1Y":
      from.setFullYear(from.getFullYear() - 1);
      break;
    case "5Y":
      from.setFullYear(from.getFullYear() - 5);
      break;
  }

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

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

    const symbol = request.nextUrl.searchParams.get("symbol");
    const timeframe = (request.nextUrl.searchParams.get("timeframe") || "1M") as Timeframe;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const { from, to } = getDateRange(timeframe);
    const prices = await getHistoricalPrices(symbol, from, to);

    return NextResponse.json({ prices, symbol, timeframe });
  } catch (error) {
    captureAPIError(error, { route: "market/historical" });
    return NextResponse.json(
      { error: "Unable to load historical data." },
      { status: 500 },
    );
  }
}
