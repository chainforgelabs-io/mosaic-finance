import { createServiceClient } from "@/lib/supabase/service";
import {
  getQuotes,
  getCompanyProfileFresh,
} from "@/lib/market-data/market-aggregator";
import { computeScores, fanoutWeight } from "./scoring";
import {
  EXTRACTION_MODEL,
  EXTRACTION_PROMPT_VERSION,
  SCORING_CONFIG_VERSION,
} from "./versions";
import type { RawSignal, TrackedXAccount } from "@/types/picks";

/** Max tickers to enrich with quotes/profiles per aggregation run. */
const MAX_ENRICHED_TICKERS = 50;
const QUOTE_BATCH_SIZE = 25;
const PROFILE_CONCURRENCY = 8;

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

export async function aggregateSignals(options?: {
  scanRunId?: string;
}): Promise<{
  tickersAggregated: number;
  snapshotsWritten: number;
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
    return { tickersAggregated: 0, snapshotsWritten: 0, errors };
  }

  // Rank by activity so quote enrichment stays bounded
  const ranked = [...buckets.values()].sort(
    (a, b) =>
      b.mentions24h + b.congressBuys30d + b.congressSells30d -
      (a.mentions24h + a.congressBuys30d + a.congressSells30d),
  );
  const enriched = ranked.slice(0, MAX_ENRICHED_TICKERS);

  // Batch quotes
  const quoteMap = new Map<
    string,
    {
      price: number;
      changePercent: number;
      volume: number;
      source: string;
      fetchedAt: string;
    }
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
          source: quote.source,
          fetchedAt: quote.fetchedAt,
        });
      }
    } catch (err) {
      errors.push(
        `quotes ${symbols.join(",")}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  // Profiles for EVERY enriched ticker (not just unseen ones): avgVolume
  // drives volume_ratio — a priceActionScore and big_mover input — and
  // marketCap/exchange are liquidity context the research snapshots cannot
  // backfill honestly later. Redis-cached 20 min, so this is cheap.
  const profileMap = new Map<
    string,
    {
      name: string;
      sector: string;
      exchange: string;
      marketCap: number;
      avgVolume: number;
      volume: number;
    }
  >();
  for (let i = 0; i < enriched.length; i += PROFILE_CONCURRENCY) {
    const batch = enriched.slice(i, i + PROFILE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((b) => getCompanyProfileFresh(b.ticker)),
    );
    results.forEach((res, idx) => {
      if (res.status === "fulfilled" && res.value) {
        const p = res.value;
        profileMap.set(batch[idx].ticker, {
          name: p.name,
          sector: p.sector,
          exchange: p.exchange,
          marketCap: p.marketCap,
          avgVolume: p.avgVolume,
          volume: p.volume,
        });
      }
    });
  }

  const upserts: Record<string, unknown>[] = [];
  const snapshots: Record<string, unknown>[] = [];
  const scannedAt = new Date().toISOString();

  for (const bucket of enriched) {
    const quote = quoteMap.get(bucket.ticker);
    const profile = profileMap.get(bucket.ticker);
    const meta = profile
      ? { name: profile.name, sector: profile.sector }
      : undefined;

    // Finnhub quotes carry no volume; fall back to the FMP profile's
    // same-day cumulative volume. Null (never 0) when genuinely unknown.
    let volumeRatio: number | null = null;
    if (profile && profile.avgVolume > 0) {
      const liveVolume =
        quote && quote.volume > 0 ? quote.volume : profile.volume;
      if (liveVolume > 0) {
        volumeRatio = liveVolume / profile.avgVolume;
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
      last_updated_at: scannedAt,
    });

    // Append-only research snapshot: full feature vector at scan time
    snapshots.push({
      scan_run_id: options?.scanRunId ?? null,
      scanned_at: scannedAt,
      ticker: bucket.ticker,
      cohort: "flagged",
      composite_score: scores.compositeScore,
      momentum_score: scores.momentumScore,
      buzz_score: scores.buzzScore,
      sentiment_score: scores.sentimentScore,
      congress_score: scores.congressScore,
      price_action_score: scores.priceActionScore,
      news_score: scores.newsScore,
      persona_score: scores.personaScore,
      big_mover: scores.bigMover,
      under_the_radar: scores.underTheRadar,
      mention_count_24h: Math.round(bucket.mentions24h),
      mention_count_7d: Math.round(bucket.mentions7d),
      firehose_mentions_24h: Math.round(bucket.firehoseMentions24h),
      tracked_weight_sum_24h: bucket.trackedScoreWeightSum24h,
      avg_sentiment_24h: avgSentiment,
      congress_buys_30d: bucket.congressBuys30d,
      congress_sells_30d: bucket.congressSells30d,
      price_at_scan: quote?.price ?? null,
      day_change_pct: quote?.changePercent ?? null,
      volume_ratio: volumeRatio,
      price_source: quote?.source ?? null,
      price_fetched_at: quote?.fetchedAt ?? null,
      avg_dollar_volume:
        profile && profile.avgVolume > 0 && quote && quote.price > 0
          ? profile.avgVolume * quote.price
          : null,
      market_cap: profile && profile.marketCap > 0 ? profile.marketCap : null,
      exchange: profile?.exchange || null,
      llm_model_version: EXTRACTION_MODEL,
      llm_prompt_version: EXTRACTION_PROMPT_VERSION,
      scoring_config_version: SCORING_CONFIG_VERSION,
    });
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("ticker_signals")
      .upsert(upserts, { onConflict: "ticker" });
    if (error) throw error;
  }

  let snapshotsWritten = 0;
  if (snapshots.length > 0) {
    const { error } = await supabase
      .from("signal_snapshots")
      .insert(snapshots);
    if (error) {
      // Snapshot loss is data loss — surface loudly but don't fail the scan
      errors.push(`snapshots: ${error.message}`);
    } else {
      snapshotsWritten = snapshots.length;
    }
  }

  return { tickersAggregated: upserts.length, snapshotsWritten, errors };
}
