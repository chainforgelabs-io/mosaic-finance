import { grokChat } from "./client";
import type { NewsArticle } from "@/lib/market-data/types";

export async function searchFinancialNews(
  query: string,
  maxResults: number = 10,
): Promise<{ summary: string; articles: NewsArticle[] }> {
  const prompt = `Search for the latest financial news about: "${query}". 
Return a JSON object with:
- "summary": a 2-3 sentence overview of the current situation
- "articles": an array of the most relevant news items, each with:
  - "title": headline
  - "summary": 1-2 sentence summary
  - "source": publication name
  - "sourceUrl": URL
  - "category": one of "macro", "equities", "crypto", "commodities", "canadian", "general"
  - "relatedTickers": array of related stock tickers
  - "publishedAt": ISO date string

Return ONLY valid JSON, no markdown.`;

  const response = await grokChat(
    [{ role: "user", content: prompt }],
    {
      temperature: 0.3,
      maxTokens: 4096,
      searchParameters: {
        mode: "on",
        sources: [{ type: "web" }, { type: "news" }],
        maxResults,
      },
    },
  );

  try {
    const parsed = JSON.parse(response);
    const articles: NewsArticle[] = (parsed.articles || []).map(
      (a: Record<string, unknown>, idx: number) => ({
        id: `grok-web-${idx}-${Date.now()}`,
        title: a.title as string,
        summary: a.summary as string,
        source: a.source as string,
        sourceUrl: a.sourceUrl as string,
        category: a.category || "general",
        relatedTickers: (a.relatedTickers as string[]) || [],
        sentimentScore: null,
        publishedAt: (a.publishedAt as string) || new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      }),
    );
    return { summary: parsed.summary || "", articles };
  } catch {
    return { summary: response.slice(0, 500), articles: [] };
  }
}

export async function getMarketOverviewNews(): Promise<{
  summary: string;
  articles: NewsArticle[];
}> {
  return searchFinancialNews(
    "today's most important financial market news US and Canadian markets",
  );
}
