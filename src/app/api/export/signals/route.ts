import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { captureAPIError } from "@/lib/sentry";
import type { RawSignal, TickerPersonaTake, TickerSignal } from "@/types/picks";

/**
 * Machine-readable signals export for external consumers (e.g. the HELM
 * trading bot). Server-to-server auth via static bearer token — never give
 * external systems the Supabase service key.
 *
 * GET /api/export/signals
 *   Authorization: Bearer ${EXPORT_API_TOKEN}
 *   ?tickers=NVDA,AMD     optional filter
 *   ?limit=50             max signals (default 50, cap 200)
 *   ?sinceHours=48        recent raw-signal window (default 48, cap 720)
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_SINCE_HOURS = 48;
const MAX_SINCE_HOURS = 720;

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const token = process.env.EXPORT_API_TOKEN?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "Export API not configured. Set EXPORT_API_TOKEN." },
        { status: 503 },
      );
    }

    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${token}`) {
      return unauthorized();
    }

    const params = request.nextUrl.searchParams;
    const tickersParam = params.get("tickers");
    const tickers = tickersParam
      ? tickersParam
          .split(",")
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean)
      : null;
    const limit = Math.min(
      parseInt(params.get("limit") || String(DEFAULT_LIMIT), 10) ||
        DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const sinceHours = Math.min(
      parseInt(params.get("sinceHours") || String(DEFAULT_SINCE_HOURS), 10) ||
        DEFAULT_SINCE_HOURS,
      MAX_SINCE_HOURS,
    );
    const sinceIso = new Date(Date.now() - sinceHours * 3600_000).toISOString();

    const supabase = createServiceClient();

    let signalsQuery = supabase
      .from("ticker_signals")
      .select("*")
      .order("composite_score", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (tickers) signalsQuery = signalsQuery.in("ticker", tickers);

    const { data: signalRows, error: signalsErr } = await signalsQuery;
    if (signalsErr) throw signalsErr;

    const exportTickers =
      tickers ?? (signalRows || []).map((s) => s.ticker as string);

    const [takesRes, recentRes] = await Promise.all([
      exportTickers.length > 0
        ? supabase
            .from("ticker_persona_takes")
            .select("*")
            .in("ticker", exportTickers)
            .gt("expires_at", new Date().toISOString())
        : Promise.resolve({ data: [], error: null }),
      exportTickers.length > 0
        ? supabase
            .from("raw_signals")
            .select("*")
            .in("ticker", exportTickers)
            .gte("occurred_at", sinceIso)
            .order("occurred_at", { ascending: false })
            .limit(500)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const signals = ((signalRows || []) as TickerSignal[]).map((s) => ({
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      lastPrice: s.last_price,
      lastChangePct: s.last_change_pct,
      compositeScore: s.composite_score,
      momentumScore: s.momentum_score,
      congressScore: s.congress_score,
      underTheRadar: s.under_the_radar ?? false,
      bigMover: s.big_mover ?? false,
      mentions24h: s.mention_count_24h ?? 0,
      mentions7d: s.mention_count_7d ?? 0,
      alphaMentions24h: s.tracked_account_mentions_24h ?? 0,
      firehoseMentions24h: s.firehose_mentions_24h ?? 0,
      congressBuys30d: s.congress_buys_30d ?? 0,
      congressSells30d: s.congress_sells_30d ?? 0,
      avgSentiment24h: s.avg_sentiment_24h,
      asOf: s.last_updated_at,
    }));

    const takes = ((takesRes.data || []) as TickerPersonaTake[]).map((t) => ({
      ticker: t.ticker,
      persona: t.persona,
      outlook: t.outlook,
      summary: t.summary,
      keyPoints: t.key_points,
      generatedAt: t.generated_at,
      expiresAt: t.expires_at,
    }));

    const recentSignals = ((recentRes.data || []) as RawSignal[]).map((r) => ({
      ticker: r.ticker,
      source: r.source,
      author: r.author_handle,
      text: r.content,
      url: r.url,
      sentiment: r.sentiment,
      occurredAt: r.occurred_at,
    }));

    return NextResponse.json({
      version: 1,
      generatedAt: new Date().toISOString(),
      signals,
      takes,
      recentSignals,
    });
  } catch (error) {
    captureAPIError(error, { route: "export/signals" });
    return NextResponse.json(
      { error: "Export failed." },
      { status: 500 },
    );
  }
}
