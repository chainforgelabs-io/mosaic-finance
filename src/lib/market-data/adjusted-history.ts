import { Redis } from "@upstash/redis";
import type { DailyBar } from "@/lib/signals/label-math";

/**
 * Fully-adjustable daily OHLC history for the forward-return labeler.
 *
 * Primary: Yahoo Finance chart API — covers every US symbol including the
 * small caps FMP gates behind premium plans (GME/AMC/MARA-class names are
 * exactly what the signal engine flags). Yahoo raw OHLC is split-adjusted;
 * the parallel `adjclose` series adds dividend adjustment, which
 * `adjustBars()` applies as a per-day factor.
 *
 * Fallback: FMP /historical-price-eod/dividend-adjusted (fully adjusted
 * OHLC directly), for symbols/plans where it responds.
 */

const redis = Redis.fromEnv();
const CACHE_TTL_SECONDS = 3600;

export interface AdjustedHistory {
  source: "yahoo_adjusted" | "fmp_eod_adjusted";
  bars: DailyBar[]; // ascending by date
}

async function fetchYahoo(
  symbol: string,
  fromIso: string,
  toIso: string,
): Promise<DailyBar[]> {
  const period1 = Math.floor(new Date(`${fromIso}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor(
    new Date(`${toIso}T00:00:00Z`).getTime() / 1000 + 86400,
  );
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=splits%2Cdividends`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (research labeler)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`yahoo chart ${symbol}: ${res.status}`);

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result?.timestamp?.length) return [];

  const quote = result.indicators?.quote?.[0];
  const adj = result.indicators?.adjclose?.[0]?.adjclose;
  const tz: string = result.meta?.exchangeTimezoneName || "America/New_York";
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const bars: DailyBar[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const open = quote?.open?.[i];
    const high = quote?.high?.[i];
    const low = quote?.low?.[i];
    const close = quote?.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    bars.push({
      date: dateFmt.format(new Date(result.timestamp[i] * 1000)),
      open,
      high,
      low,
      close,
      adjClose: adj?.[i] ?? undefined,
    });
  }
  return bars;
}

interface FMPAdjustedRow {
  date: string;
  adjOpen?: number;
  adjHigh?: number;
  adjLow?: number;
  adjClose?: number;
}

async function fetchFMPAdjusted(
  symbol: string,
  fromIso: string,
  toIso: string,
): Promise<DailyBar[]> {
  const url = new URL(
    "https://financialmodelingprep.com/stable/historical-price-eod/dividend-adjusted",
  );
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("from", fromIso);
  url.searchParams.set("to", toIso);
  url.searchParams.set("apikey", process.env.FMP_API_KEY!);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`fmp adjusted ${symbol}: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`fmp adjusted ${symbol}: gated`);

  return (data as FMPAdjustedRow[])
    .filter(
      (r) =>
        r.adjOpen != null &&
        r.adjHigh != null &&
        r.adjLow != null &&
        r.adjClose != null,
    )
    .map((r) => ({
      // Already fully adjusted — leave adjClose unset so the factor is 1
      date: r.date,
      open: r.adjOpen!,
      high: r.adjHigh!,
      low: r.adjLow!,
      close: r.adjClose!,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAdjustedHistory(
  symbol: string,
  fromIso: string,
  toIso: string,
): Promise<AdjustedHistory | null> {
  const cacheKey = `labeler:history:${symbol}:${fromIso}:${toIso}`;
  try {
    const cached = await redis.get<AdjustedHistory>(cacheKey);
    if (cached) return cached;
  } catch {
    // cache miss path
  }

  let history: AdjustedHistory | null = null;
  try {
    const bars = await fetchYahoo(symbol, fromIso, toIso);
    if (bars.length > 0) history = { source: "yahoo_adjusted", bars };
  } catch {
    // fall through to FMP
  }

  if (!history) {
    try {
      const bars = await fetchFMPAdjusted(symbol, fromIso, toIso);
      if (bars.length > 0) history = { source: "fmp_eod_adjusted", bars };
    } catch {
      return null;
    }
  }

  if (history) {
    try {
      await redis.set(cacheKey, JSON.stringify(history), {
        ex: CACHE_TTL_SECONDS,
      });
    } catch {
      // non-critical
    }
  }
  return history;
}
