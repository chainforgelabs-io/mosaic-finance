import { NextRequest, NextResponse } from "next/server";
import { captureAPIError } from "@/lib/sentry";
import { runScan, getCurrentMode } from "@/lib/signals/run-scan";
import { enrichTopTickers } from "@/lib/signals/persona-takes";
import { MODE_CONFIG } from "@/lib/signals/mode-config";

export const maxDuration = 300;

/**
 * Scheduled scan (Vercel Cron). Light mode skips firehose; heavy includes it.
 * Pass ?enrich=1 to also refresh persona takes for the top-N tickers
 * (used by the nightly schedule).
 */
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const isNightly = request.nextUrl.searchParams.get("enrich") === "1";
    const mode = await getCurrentMode();

    // Cron fires every 30 min; light mode only acts on the top-of-hour tick
    if (!isNightly && mode === "light" && new Date().getUTCMinutes() >= 15) {
      return NextResponse.json({ skipped: "light mode runs hourly" });
    }

    const summary = await runScan({ mode });

    let enrichment: { tickersEnriched: string[]; errors: string[] } | null =
      null;
    if (isNightly) {
      enrichment = await enrichTopTickers(MODE_CONFIG[mode].topPersonasNightly);
    }

    return NextResponse.json({ summary, enrichment });
  } catch (error) {
    captureAPIError(error, { route: "cron/picks-scan" });
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
