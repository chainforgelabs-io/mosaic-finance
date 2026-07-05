import { classifyNewsCategory, type Quote, type NewsArticle, type CompanyProfile, type MarketMover, type SearchResult } from "./types";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

async function finnhubFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${FINNHUB_BASE}${endpoint}`);
  url.searchParams.set("token", API_KEY!);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Finnhub ${endpoint} failed: ${res.status}`);
  }

  return res.json();
}

interface FinnhubQuote {
  c: number; // current
  d: number; // change
  dp: number; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
}

export async function getQuote(symbol: string): Promise<Quote> {
  const data = await finnhubFetch<FinnhubQuote>("/quote", { symbol });

  return {
    symbol,
    name: symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    volume: 0,
    previousClose: data.pc,
    open: data.o,
    high: data.h,
    low: data.l,
    latestTradingDay: new Date().toISOString().split("T")[0],
    source: "finnhub",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getMultipleQuotes(
  symbols: string[],
): Promise<Quote[]> {
  const results = await Promise.allSettled(
    symbols.map((s) => getQuote(s)),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}

interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

export async function getCompanyProfile(
  symbol: string,
): Promise<CompanyProfile | null> {
  const data = await finnhubFetch<FinnhubProfile>("/stock/profile2", {
    symbol,
  });

  if (!data.name) return null;

  return {
    symbol: data.ticker,
    name: data.name,
    description: "",
    exchange: data.exchange,
    currency: data.currency,
    country: data.country,
    sector: data.finnhubIndustry,
    industry: data.finnhubIndustry,
    marketCap: data.marketCapitalization * 1_000_000,
    peRatio: null,
    dividendYield: null,
    weekHigh52: 0,
    weekLow52: 0,
    avgVolume: 0,
    volume: 0,
    website: data.weburl,
    logo: data.logo,
  };
}

interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export async function getMarketNews(
  category: string = "general",
): Promise<NewsArticle[]> {
  const data = await finnhubFetch<FinnhubNews[]>("/news", {
    category,
  });

  return data.slice(0, 30).map((item) => ({
    id: `finnhub-${item.id}`,
    title: item.headline,
    summary: item.summary,
    source: item.source,
    sourceUrl: item.url,
    imageUrl: item.image || undefined,
    category: classifyNewsCategory(item.headline, item.summary),
    relatedTickers: item.related ? item.related.split(",") : [],
    sentimentScore: null,
    publishedAt: new Date(item.datetime * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
  }));
}

export async function getCompanyNews(
  symbol: string,
  from: string,
  to: string,
): Promise<NewsArticle[]> {
  const data = await finnhubFetch<FinnhubNews[]>("/company-news", {
    symbol,
    from,
    to,
  });

  return data.slice(0, 20).map((item) => ({
    id: `finnhub-${item.id}`,
    title: item.headline,
    summary: item.summary,
    source: item.source,
    sourceUrl: item.url,
    imageUrl: item.image || undefined,
    category: "equities" as const,
    relatedTickers: [symbol],
    sentimentScore: null,
    publishedAt: new Date(item.datetime * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
  }));
}

interface FinnhubPeer {
  symbol: string;
}

export async function getPeers(symbol: string): Promise<string[]> {
  const data = await finnhubFetch<string[]>("/stock/peers", { symbol });
  return data.filter((s) => s !== symbol).slice(0, 10);
}

interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const data = await finnhubFetch<FinnhubSearchResult>("/search", { q: query });

  return (data.result || []).slice(0, 10).map((r) => ({
    symbol: r.symbol,
    name: r.description,
    exchange: r.displaySymbol,
    type: r.type || "stock",
  }));
}

export async function getMarketMovers(): Promise<{
  gainers: MarketMover[];
  losers: MarketMover[];
}> {
  return { gainers: [], losers: [] };
}
