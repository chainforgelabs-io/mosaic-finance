import { getAggregatedNews } from "@/lib/market-data/market-aggregator";
import { validateTickers } from "./ticker-extractor";
import { insertRawSignals, type RawSignalInsert } from "./store";

/**
 * Converts the existing aggregated news feed (Finnhub + FMP, already cached)
 * into per-ticker raw signals. Cheap: no extra API quota beyond the news
 * cache the News tab already maintains.
 */
export async function ingestNews(): Promise<{
  signalsIngested: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let articles;
  try {
    articles = await getAggregatedNews();
  } catch (err) {
    errors.push(`news: ${err instanceof Error ? err.message : "unknown"}`);
    return { signalsIngested: 0, errors };
  }

  const rows: RawSignalInsert[] = [];

  for (const article of articles) {
    if (!article.relatedTickers || article.relatedTickers.length === 0) {
      continue;
    }
    const tickers = await validateTickers(article.relatedTickers);
    if (tickers.length === 0) continue;

    // Article ids regenerate per fetch; key on title+date for idempotency
    const sourceId = `${article.title.toLowerCase().slice(0, 80)}|${article.publishedAt.slice(0, 10)}`;

    for (const ticker of tickers) {
      rows.push({
        source: "news",
        source_id: sourceId,
        ticker,
        content: `${article.title} — ${article.summary}`.slice(0, 2000),
        url: article.sourceUrl || null,
        sentiment: article.sentimentScore,
        occurred_at: article.publishedAt,
      });
    }
  }

  const signalsIngested = await insertRawSignals(rows);
  return { signalsIngested, errors };
}
