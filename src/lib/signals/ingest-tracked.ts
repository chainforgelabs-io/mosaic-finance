import { grokChat } from "@/lib/grok/client";
import { createServiceClient } from "@/lib/supabase/service";
import { extractCashtags, validateTickers } from "./ticker-extractor";
import { insertRawSignals, sentimentToNumber, type RawSignalInsert } from "./store";
import { EXTRACTION_MODEL, EXTRACTION_PROMPT_VERSION } from "./versions";
import type { TrackedXAccount } from "@/types/picks";

/** Grok x_search allows at most 10 handles per request. */
const HANDLES_PER_BATCH = 10;
const DEFAULT_LOOKBACK_HOURS = 24;

interface GrokPost {
  id?: string;
  text?: string;
  author?: string;
  authorHandle?: string;
  url?: string;
  timestamp?: string;
  likes?: number;
  reposts?: number;
  sentiment?: string;
  tickers?: string[];
}

/** Stable fallback id when Grok omits the tweet id. */
function stableId(handle: string, text: string, timestamp: string): string {
  let hash = 5381;
  const input = `${handle}|${timestamp}|${text}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return `h${(hash >>> 0).toString(36)}`;
}

function parseGrokPosts(response: string): GrokPost[] {
  try {
    const cleaned = response
      .replace(/```(?:json)?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const posts = Array.isArray(parsed) ? parsed : parsed.posts;
    return Array.isArray(posts) ? posts : [];
  } catch {
    return [];
  }
}

async function fetchBatch(
  handles: string[],
  fromDate: string,
): Promise<GrokPost[]> {
  const prompt = `Search X (Twitter) for stock and investing related posts from these specific accounts since ${fromDate}: ${handles.map((h) => "@" + h).join(", ")}.

For every post that mentions a stock, company, ETF, or actionable market view, return it. Respond with a JSON object: { "posts": [...] } where each post has:
- "id": the post/tweet ID if known
- "text": full post text
- "authorHandle": @handle without the @
- "url": link to the post if known
- "timestamp": ISO date string
- "likes": number
- "reposts": number
- "sentiment": "bullish", "bearish", or "neutral" toward the mentioned stock(s)
- "tickers": array of stock ticker symbols the post is about (e.g. ["NVDA"]). Infer tickers from company names when not cashtagged.

Only include posts since ${fromDate}. Return ONLY valid JSON, no markdown.`;

  const response = await grokChat([{ role: "user", content: prompt }], {
    model: EXTRACTION_MODEL,
    temperature: 0.2,
    maxTokens: 8192,
    tools: [
      {
        type: "x_search",
        allowed_x_handles: handles,
        from_date: fromDate.split("T")[0],
      },
    ],
  });

  return parseGrokPosts(response);
}

export async function ingestTrackedAccounts(options?: {
  lookbackHours?: number;
}): Promise<{ postsIngested: number; accountsScanned: number; errors: string[] }> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  const { data: accounts, error } = await supabase
    .from("tracked_x_accounts")
    .select("*")
    .eq("active", true);

  if (error) throw error;
  const active = (accounts || []) as TrackedXAccount[];
  if (active.length === 0) {
    return { postsIngested: 0, accountsScanned: 0, errors: [] };
  }

  const lookback = options?.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
  const fromDate = new Date(Date.now() - lookback * 3600_000).toISOString();
  const handleWeights = new Map(
    active.map((a) => [a.handle.toLowerCase(), a.weight]),
  );

  const rows: RawSignalInsert[] = [];

  for (let i = 0; i < active.length; i += HANDLES_PER_BATCH) {
    const batch = active.slice(i, i + HANDLES_PER_BATCH).map((a) => a.handle);
    try {
      const posts = await fetchBatch(batch, fromDate);
      for (const post of posts) {
        const text = post.text || "";
        if (!text) continue;
        const handle = (post.authorHandle || "").replace(/^@/, "");
        // Only trust posts from handles we actually track
        if (!handleWeights.has(handle.toLowerCase())) continue;

        const candidates = [
          ...(post.tickers || []),
          ...extractCashtags(text),
        ];
        const tickers = await validateTickers(candidates);
        if (tickers.length === 0) continue;

        const timestamp = post.timestamp || new Date().toISOString();
        const sourceId = post.id || stableId(handle, text, timestamp);
        const engagement = (post.likes || 0) + (post.reposts || 0);
        const sentiment = sentimentToNumber(post.sentiment);

        for (const ticker of tickers) {
          rows.push({
            source: "x_tracked",
            source_id: sourceId,
            ticker,
            author_handle: handle,
            content: text.slice(0, 2000),
            url: post.url || null,
            sentiment,
            engagement,
            occurred_at: timestamp,
            model: EXTRACTION_MODEL,
            prompt_version: EXTRACTION_PROMPT_VERSION,
          });
        }
      }
    } catch (err) {
      errors.push(
        `tracked batch ${batch.join(",")}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  const postsIngested = await insertRawSignals(rows);

  await supabase
    .from("tracked_x_accounts")
    .update({ last_ingested_at: new Date().toISOString() })
    .eq("active", true);

  return { postsIngested, accountsScanned: active.length, errors };
}
