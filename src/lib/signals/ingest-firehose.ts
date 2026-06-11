import { grokChat } from "@/lib/grok/client";
import { extractCashtags, validateTickers } from "./ticker-extractor";
import { insertRawSignals, sentimentToNumber, type RawSignalInsert } from "./store";

/**
 * Broad X discovery: surfaces tickers with unusually elevated discussion
 * regardless of source account. Complements the curated tracked list by
 * catching micro-trends early.
 */

const MEGA_CAPS =
  "AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSLA, BRK.B, AVGO, LLY, JPM, V, UNH, XOM, MA, JNJ, PG, HD, COST, WMT";

interface FirehoseTrend {
  ticker?: string;
  reason?: string;
  samplePost?: string;
  sampleAuthorHandle?: string;
  sampleUrl?: string;
  approxMentions?: number;
  sentiment?: string;
}

export async function ingestFirehose(): Promise<{
  postsIngested: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const prompt = `Search X (Twitter) for stock tickers with unusually elevated discussion volume in the last 12 hours from finance/trading accounts. Focus on emerging or accelerating discussion — NOT the permanently-popular mega caps (${MEGA_CAPS}) unless something truly unusual is happening to them today.

Return a JSON object: { "trends": [...] } with up to 15 entries, each:
- "ticker": stock ticker symbol
- "reason": 1-2 sentences on why it's trending
- "samplePost": text of one representative post
- "sampleAuthorHandle": @handle of that post's author (without @)
- "sampleUrl": URL of that post if known
- "approxMentions": rough count of distinct posts you saw discussing it
- "sentiment": "bullish", "bearish", or "neutral" overall

Return ONLY valid JSON, no markdown.`;

  let trends: FirehoseTrend[] = [];
  try {
    const response = await grokChat([{ role: "user", content: prompt }], {
      temperature: 0.3,
      maxTokens: 6144,
      tools: [{ type: "x_search" }],
    });
    const cleaned = response
      .replace(/```(?:json)?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    trends = Array.isArray(parsed) ? parsed : parsed.trends || [];
  } catch (err) {
    errors.push(
      `firehose: ${err instanceof Error ? err.message : "unknown"}`,
    );
    return { postsIngested: 0, errors };
  }

  const rows: RawSignalInsert[] = [];
  const now = new Date().toISOString();
  const windowKey = now.slice(0, 13); // hourly bucket keeps re-runs idempotent

  for (const trend of trends) {
    const candidates = [
      ...(trend.ticker ? [trend.ticker] : []),
      ...extractCashtags(trend.samplePost || ""),
    ];
    const tickers = await validateTickers(candidates);
    if (tickers.length === 0) continue;

    const ticker = tickers[0];
    const mentions = Math.max(1, Math.min(trend.approxMentions || 1, 500));
    const sentiment = sentimentToNumber(trend.sentiment);
    const content = [trend.reason, trend.samplePost]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 2000);

    // One row per approximate mention bucket would inflate storage; instead
    // store a single trend row and carry the volume in `engagement`.
    rows.push({
      source: "x_firehose",
      source_id: `fh-${windowKey}-${ticker}`,
      ticker,
      author_handle: trend.sampleAuthorHandle || null,
      content,
      url: trend.sampleUrl || null,
      sentiment,
      engagement: mentions,
      occurred_at: now,
    });
  }

  const postsIngested = await insertRawSignals(rows);
  return { postsIngested, errors };
}
