import { grokChat } from "./client";
import type { SocialSentiment, SocialPost } from "@/lib/market-data/types";

export async function getTickerSentiment(
  ticker: string,
): Promise<SocialSentiment> {
  const prompt = `Search X (Twitter) for recent posts about the stock ticker $${ticker}. 
Analyze the overall sentiment and return a JSON object with:
- "topic": the ticker symbol
- "overallSentiment": "bullish", "bearish", or "neutral"
- "summary": 2-3 sentence summary of what people are saying
- "posts": array of up to 8 notable posts, each with:
  - "text": the post content (cleaned up)
  - "author": display name
  - "authorHandle": @handle
  - "timestamp": ISO date string
  - "likes": number
  - "reposts": number
  - "sentiment": "bullish", "bearish", or "neutral"

Return ONLY valid JSON, no markdown.`;

  const response = await grokChat(
    [{ role: "user", content: prompt }],
    {
      temperature: 0.3,
      maxTokens: 4096,
      searchParameters: {
        mode: "on",
        sources: [{ type: "x" }],
        maxResults: 20,
      },
    },
  );

  try {
    const parsed = JSON.parse(response);
    const posts: SocialPost[] = (parsed.posts || []).map(
      (p: Record<string, unknown>, idx: number) => ({
        id: `x-${ticker}-${idx}-${Date.now()}`,
        text: p.text as string,
        author: p.author as string,
        authorHandle: p.authorHandle as string,
        timestamp: (p.timestamp as string) || new Date().toISOString(),
        likes: (p.likes as number) || 0,
        reposts: (p.reposts as number) || 0,
        sentiment: (p.sentiment as SocialPost["sentiment"]) || "neutral",
      }),
    );

    return {
      topic: ticker,
      posts,
      overallSentiment: parsed.overallSentiment || "neutral",
      summary: parsed.summary || "",
    };
  } catch {
    return {
      topic: ticker,
      posts: [],
      overallSentiment: "neutral",
      summary: "Unable to parse social sentiment data.",
    };
  }
}

export async function getMarketSentiment(): Promise<SocialSentiment> {
  const prompt = `Search X (Twitter) for the latest trending financial and stock market discussions today.
Analyze the overall market sentiment and return a JSON object with:
- "topic": "market"
- "overallSentiment": "bullish", "bearish", or "neutral"
- "summary": 3-4 sentence summary of what the financial community is discussing on X right now
- "posts": array of up to 10 notable finance-related posts, each with:
  - "text": the post content
  - "author": display name
  - "authorHandle": @handle
  - "timestamp": ISO date string
  - "likes": number
  - "reposts": number
  - "sentiment": "bullish", "bearish", or "neutral"

Return ONLY valid JSON, no markdown.`;

  const response = await grokChat(
    [{ role: "user", content: prompt }],
    {
      temperature: 0.3,
      maxTokens: 4096,
      searchParameters: {
        mode: "on",
        sources: [{ type: "x" }],
        maxResults: 30,
      },
    },
  );

  try {
    const parsed = JSON.parse(response);
    const posts: SocialPost[] = (parsed.posts || []).map(
      (p: Record<string, unknown>, idx: number) => ({
        id: `x-market-${idx}-${Date.now()}`,
        text: p.text as string,
        author: p.author as string,
        authorHandle: p.authorHandle as string,
        timestamp: (p.timestamp as string) || new Date().toISOString(),
        likes: (p.likes as number) || 0,
        reposts: (p.reposts as number) || 0,
        sentiment: (p.sentiment as SocialPost["sentiment"]) || "neutral",
      }),
    );

    return {
      topic: "market",
      posts,
      overallSentiment: parsed.overallSentiment || "neutral",
      summary: parsed.summary || "",
    };
  } catch {
    return {
      topic: "market",
      posts: [],
      overallSentiment: "neutral",
      summary: "Unable to parse market sentiment data.",
    };
  }
}
