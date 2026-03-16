import { Redis } from "@upstash/redis";
import * as finnhub from "./finnhub";
import * as fmp from "./fmp";
import { getMarketContext, formatQuoteSummary } from "./alpha-vantage";
import type {
  Quote,
  HistoricalPrice,
  CompanyProfile,
  SectorPerformance,
  MarketMover,
  SearchResult,
  NewsArticle,
} from "./types";

const redis = Redis.fromEnv();

const CACHE_TTL = {
  quote: 120,        // 2 minutes during market hours
  historical: 3600,  // 1 hour
  profile: 86400,    // 24 hours
  sectors: 600,      // 10 minutes
  movers: 300,       // 5 minutes
  search: 1800,      // 30 minutes
  news: 900,         // 15 minutes
} as const;

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<T>(key);
    return data;
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttl });
  } catch {
    // Cache write failure is non-critical
  }
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const cacheKey = `market:quotes:${symbols.sort().join(",")}`;
  const cached = await getCached<Quote[]>(cacheKey);
  if (cached) return cached;

  try {
    const quotes = await finnhub.getMultipleQuotes(symbols);
    if (quotes.length > 0) {
      await setCache(cacheKey, quotes, CACHE_TTL.quote);
      return quotes;
    }
  } catch {
    // Finnhub failed, try FMP
  }

  try {
    const quotes = await fmp.getMultipleQuotes(symbols);
    if (quotes.length > 0) {
      await setCache(cacheKey, quotes, CACHE_TTL.quote);
      return quotes;
    }
  } catch {
    // FMP failed, try Alpha Vantage for known symbols
  }

  // Alpha Vantage fallback for core symbols
  try {
    const avData = await getMarketContext();
    const avSummary = formatQuoteSummary(avData);
    const quotes: Quote[] = [];

    const avMap: Record<string, typeof avSummary.tsx> = {
      "XIU.TO": avSummary.tsx,
      SPY: avSummary.sp500,
      "ZAG.TO": avSummary.bonds,
    };

    for (const symbol of symbols) {
      const avQuote = avMap[symbol];
      if (avQuote) {
        quotes.push({
          symbol: avQuote.symbol,
          name: avQuote.symbol,
          price: parseFloat(avQuote.price),
          change: parseFloat(avQuote.change),
          changePercent: parseFloat(avQuote.changePercent.replace("%", "")),
          volume: parseInt(avQuote.volume, 10),
          previousClose: 0,
          open: 0,
          high: 0,
          low: 0,
          latestTradingDay: avQuote.latestTradingDay,
          source: "alpha_vantage",
          fetchedAt: avData.fetchedAt,
        });
      }
    }

    if (quotes.length > 0) {
      await setCache(cacheKey, quotes, CACHE_TTL.quote);
    }
    return quotes;
  } catch {
    return [];
  }
}

export async function getHistoricalPrices(
  symbol: string,
  from?: string,
  to?: string,
): Promise<HistoricalPrice[]> {
  const cacheKey = `market:historical:${symbol}:${from || ""}:${to || ""}`;
  const cached = await getCached<HistoricalPrice[]>(cacheKey);
  if (cached) return cached;

  const prices = await fmp.getHistoricalPrices(symbol, from, to);
  if (prices.length > 0) {
    await setCache(cacheKey, prices, CACHE_TTL.historical);
  }
  return prices;
}

export async function getCompanyProfile(
  symbol: string,
): Promise<CompanyProfile | null> {
  const cacheKey = `market:profile:${symbol}`;
  const cached = await getCached<CompanyProfile>(cacheKey);
  if (cached) return cached;

  try {
    const profile = await fmp.getCompanyProfile(symbol);
    if (profile) {
      await setCache(cacheKey, profile, CACHE_TTL.profile);
      return profile;
    }
  } catch {
    // FMP failed, try Finnhub
  }

  const profile = await finnhub.getCompanyProfile(symbol);
  if (profile) {
    await setCache(cacheKey, profile, CACHE_TTL.profile);
  }
  return profile;
}

export async function getSectorPerformance(): Promise<SectorPerformance[]> {
  const cacheKey = "market:sectors";
  const cached = await getCached<SectorPerformance[]>(cacheKey);
  if (cached) return cached;

  const sectors = await fmp.getSectorPerformance();
  if (sectors.length > 0) {
    await setCache(cacheKey, sectors, CACHE_TTL.sectors);
  }
  return sectors;
}

export async function getMarketMovers(): Promise<{
  gainers: MarketMover[];
  losers: MarketMover[];
}> {
  const cacheKey = "market:movers";
  const cached = await getCached<{ gainers: MarketMover[]; losers: MarketMover[] }>(cacheKey);
  if (cached) return cached;

  const [gainers, losers] = await Promise.all([
    fmp.getGainers(),
    fmp.getLosers(),
  ]);

  const result = { gainers, losers };
  await setCache(cacheKey, result, CACHE_TTL.movers);
  return result;
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return [];

  const cacheKey = `market:search:${query.toLowerCase()}`;
  const cached = await getCached<SearchResult[]>(cacheKey);
  if (cached) return cached;

  const results = await fmp.searchTickers(query);
  if (results.length > 0) {
    await setCache(cacheKey, results, CACHE_TTL.search);
  }
  return results;
}

export async function getAggregatedNews(
  category?: string,
): Promise<NewsArticle[]> {
  const cacheKey = `market:news:${category || "all"}`;
  const cached = await getCached<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  const [finnhubNews, fmpNews] = await Promise.allSettled([
    finnhub.getMarketNews(category === "general" ? "general" : "general"),
    fmp.getStockNews(undefined, 20),
  ]);

  const articles: NewsArticle[] = [];

  if (finnhubNews.status === "fulfilled") {
    articles.push(...finnhubNews.value);
  }
  if (fmpNews.status === "fulfilled") {
    articles.push(...fmpNews.value);
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  const deduped = articles.filter((a) => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by publish date descending
  deduped.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const result = deduped.slice(0, 40);
  if (result.length > 0) {
    await setCache(cacheKey, result, CACHE_TTL.news);
  }
  return result;
}

export const DEFAULT_INDICES = [
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "XIU.TO", name: "TSX Composite" },
  { symbol: "QQQ", name: "NASDAQ 100" },
  { symbol: "DIA", name: "Dow Jones" },
  { symbol: "ZAG.TO", name: "CA Aggregate Bonds" },
  { symbol: "GLD", name: "Gold" },
];
