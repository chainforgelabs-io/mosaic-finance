import { NextRequest, NextResponse } from "next/server";
import { captureAPIError } from "@/lib/sentry";
import { ingestCongressTrades } from "@/lib/signals/ingest-congress";
import { aggregateSignals } from "@/lib/signals/aggregate";

export const maxDuration = 300;

/** Daily congress-trade ingestion (filings disclose on multi-day lag). */
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestCongressTrades();
    const aggregation = await aggregateSignals();
    return NextResponse.json({ result, aggregation });
  } catch (error) {
    captureAPIError(error, { route: "cron/picks-congress" });
    return NextResponse.json(
      { error: "Congress ingestion failed" },
      { status: 500 },
    );
  }
}
