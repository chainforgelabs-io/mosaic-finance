import { createServiceClient } from "@/lib/supabase/service";
import { getQuotes, getCompanyProfile } from "@/lib/market-data/market-aggregator";
import { computeScores, fanoutWeight } from "./scoring";
import type { RawSignal, TrackedXAccount } from "@/types/picks";

/** Max tickers to enrich with quotes/profiles per aggregation run. */
const MAX_ENRICHED_TICKERS = 50;
const QUOTE_BATCH_SIZE = 25;

interface TickerBucket {
  ticker: string;
  mentions24h: number;
  mentions7d: number;
  /** Raw counts for display */
  trackedMentions24h: number;
  newsMentions24h: number;
  /** Fan-out dampened values that feed the composite score */
  trackedScoreMentions24h: number;
  trackedScoreWeightSum24h: number;
  newsScoreMentions24h: number;
  firehoseMentions24h: number;
  firehoseMentions7d: number;
  congressBuys30d: number;
  congressSells30d: number;
  sentimentSum24h: number;
  sentimentCount24h: number;
}

function emptyBucket(ticker: string): TickerBucket {
  return {
    ticker,
    mentions24h: 0,
    mentions7d: 0,
    trackedMentions24h: 0,
    newsMentions24h: 0,
    trackedScoreMentions24h: 0,
    trackedScoreWeightSum24h: 0,
    newsScoreMentions24h: 0,
    firehoseMentions24h: 0,
    firehoseMentions7d: 0,
    congressBuys30d: 0,
    congressSells30d: 0,
    sentimentSum24h: 0,
    sentimentCount24h: 0,
  };
}

/**
 * Tickers named per post: a roundup tweet listing 12 names fans out into 12
 * raw_signals rows sharing (source, source_id). Used to dampen multi-ticker
 * posts so focused calls dominate the score.
 */
function buildFanoutMap(signals: RawSignal[]): Map<string, number> {
  const fanout = new Map<string, number>();
  for (const signal of signals) {
    if (signal.source !== "x_tracked" && signal.source !== "news") continue;
    const key = `${signal.source}|${signal.source_id}`;
    fanout.set(key, (fanout.get(key) || 0) + 1);
  }
  return fanout;
}

async function fetchRecentSignals(): Promise<RawSignal[]> {
  const supabase = createServiceClient();
  const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();
  const all: RawSignal[] = [];
  const PAGE = 1000;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("raw_signals")
      .select("*")
      .gte("occurred_at", since30d)
      .order("occurred_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data || []) as RawSignal[];
    all.push(...page);
    if (page.length < PAGE || all.length >= 20_000) break;
  }
  return all;
}

export async function aggregateSignals(): Promise<{
  tickersAggregated: number;
  errors: string[];
}> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  const [signals, accountsRes, takesRes] = await Promise.all([
    fetchRecentSignals(),
    supabase.from("tracked_x_accounts").select("handle, weight"),
    supabase
      .from("ticker_persona_takes")
      .select("ticker, outlook")
      .gt("expires_at", new Date().toISOString()),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  const weightByHandle = new Map(
    ((accountsRes.data || []) as Pick<TrackedXAccount, "handle" | "weight">[]).map(
      (a) => [a.handle.toLowerCase(), a.weight],
    ),
  );

  const personaCounts = new Map<string, { bullish: number; bearish: number }>();
  for (const take of takesRes.data || []) {
    const entry = personaCounts.get(take.ticker) || { bullish: 0, bearish: 0 };
    if (take.outlook === "bullish" || take.outlook === "very_bullish") {
      entry.bullish++;
    } else if (take.outlook === "bearish" || take.outlook === "very_bearish") {
      entry.bearish++;
    }
    personaCounts.set(take.ticker, entry);
  }

  const now = Date.now();
  const cut24h = now - 86400_000;
  const cut7d = now - 7 * 86400_000;

  const buckets = new Map<string, TickerBucket>();
  const fanoutMap = buildFanoutMap(signals);

  for (const signal of signals) {
    const occurred = new Date(signal.occurred_at).getTime();
    const bucket =
      buckets.get(signal.ticker) ?? emptyBucket(signal.ticker);
    buckets.set(signal.ticker, bucket);

    const within24h = occurred >= cut24h;
    const within7d = occurred >= cut7d;

    // Firehose rows carry approximate mention volume in `engagement`
    const volume =
      signal.source === "x_firehose" ? Math.max(1, signal.engagement || 1) : 1;

    if (within7d) bucket.mentions7d += volume;
    if (within24h) bucket.mentions24h += volume;

    const fanout =
      fanoutMap.get(`${signal.source}|${signal.source_id}`) ?? 1;

    switch (signal.source) {
      case "x_tracked":
        if (within24h) {
          bucket.trackedMentions24h += 1;
          // Roundup posts (many tickers) carry no per-ticker alpha signal
          const alphaWeight = fanoutWeight(fanout, { roundupCutoff: true });
          bucket.trackedScoreMentions24h += alphaWeight;
          bucket.trackedScoreWeightSum24h +=
            alphaWeight *
            (weightByHandle.get((signal.author_handle || "").toLowerCase()) ??
              0.5);
        }
        break;
      case "x_firehose":
        if (within24h) bucket.firehoseMentions24h += volume;
        if (within7d) bucket.firehoseMentions7d += volume;
        break;
      case "congress":
        // 30-day window: all fetched congress signals qualify
        if (signal.sentiment !== null && signal.sentiment > 0) {
          bucket.congressBuys30d += 1;
        } else if (signal.sentiment !== null && signal.sentiment < 0) {
          bucket.congressSells30d += 1;
        }
        break;
      case "news":
        if (within24h) {
          bucket.newsMentions24h += 1;
          bucket.newsScoreMentions24h += fanoutWeight(fanout);
        }
        break;
      case "price_action":
        break;
    }

    if (within24h && signal.sentiment !== null) {
      bucket.sentimentSum24h += signal.sentiment;
      bucket.sentimentCount24h += 1;
    }
  }

  if (buckets.size === 0) {
    return { tickersAggregated: 0, errors };
  }

  // Rank by activity so quote enrichment stays bounded
  const ranked = [...buckets.values()].sort(
    (a, b) =>
      b.mentions24h + b.congressBuys30d + b.congressSells30d -
      (a.mentions24h + a.congressBuys30d + a.congressSells30d),
  );
  const enriched = ranked.slice(0, MAX_ENRICHED_TICKERS);

  // Existing rows: reuse name/sector to avoid refetching profiles
  const { data: existingRows } = await supabase
    .from("ticker_signals")
    .select("ticker, name, sector")
    .in("ticker", enriched.map((b) => b.ticker));
  const existingMeta = new Map(
    (existingRows || []).map((r) => [r.ticker, { name: r.name, sector: r.sector }]),
  );

  // Batch quotes
  const quoteMap = new Map<
    string,
    { price: number; changePercent: number; volume: number }
  >();
  for (let i = 0; i < enriched.length; i += QUOTE_BATCH_SIZE) {
    const symbols = enriched.slice(i, i + QUOTE_BATCH_SIZE).map((b) => b.ticker);
    try {
      const quotes = await getQuotes(symbols);
      for (const quote of quotes) {
        quoteMap.set(quote.symbol, {
          price: quote.price,
          changePercent: quote.changePercent,
          volume: quote.volume,
        });
      }
    } catch (err) {
      errors.push(
        `quotes ${symbols.join(",")}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  const upserts: Record<string, unknown>[] = [];

  for (const bucket of enriched) {
    const quote = quoteMap.get(bucket.ticker);
    let meta = existingMeta.get(bucket.ticker);
    let volumeRatio: number | null = null;

    // Profile fetch only for unseen tickers (Redis-cached 24h downstream)
    if (!meta?.name) {
      try {
        const profile = await getCompanyProfile(bucket.ticker);
        if (profile) {
          meta = { name: profile.name, sector: profile.sector };
          if (quote && profile.avgVolume > 0) {
            volumeRatio = quote.volume / profile.avgVolume;
          }
        }
      } catch {
        // Non-critical
      }
    }

    const personas = personaCounts.get(bucket.ticker) || {
      bullish: 0,
      bearish: 0,
    };
    const avgSentiment =
      bucket.sentimentCount24h > 0
        ? bucket.sentimentSum24h / bucket.sentimentCount24h
        : null;
    const baseline7dAvg = bucket.firehoseMentions7d / 7;

    // Score inputs use fan-out dampened values; display fields stay raw
    const scores = computeScores({
      trackedMentions24h: bucket.trackedScoreMentions24h,
      trackedWeightSum24h: bucket.trackedScoreWeightSum24h,
      firehoseMentions24h: bucket.firehoseMentions24h,
      firehoseBaseline7dAvg: baseline7dAvg,
      avgSentiment24h: avgSentiment,
      congressBuys30d: bucket.congressBuys30d,
      congressSells30d: bucket.congressSells30d,
      changePct1d: quote?.changePercent ?? null,
      volumeRatio,
      newsMentions24h: bucket.newsScoreMentions24h,
      personaBullishCount: personas.bullish,
      personaBearishCount: personas.bearish,
    });

    upserts.push({
      ticker: bucket.ticker,
      name: meta?.name ?? null,
      sector: meta?.sector ?? null,
      last_price: quote?.price ?? null,
      last_change_pct: quote?.changePercent ?? null,
      mention_count_24h: Math.round(bucket.mentions24h),
      mention_count_7d: Math.round(bucket.mentions7d),
      tracked_account_mentions_24h: bucket.trackedMentions24h,
      firehose_mentions_24h: Math.round(bucket.firehoseMentions24h),
      congress_buys_30d: bucket.congressBuys30d,
      congress_sells_30d: bucket.congressSells30d,
      avg_sentiment_24h: avgSentiment,
      momentum_score: scores.momentumScore,
      value_score: scores.priceActionScore,
      congress_score: scores.congressScore,
      composite_score: scores.compositeScore,
      under_the_radar: scores.underTheRadar,
      big_mover: scores.bigMover,
      last_updated_at: new Date().toISOString(),
    });
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("ticker_signals")
      .upsert(upserts, { onConflict: "ticker" });
    if (error) throw error;
  }

  return { tickersAggregated: upserts.length, errors };
}
