import type {
  Quote,
  HistoricalPrice,
  CompanyProfile,
  SectorPerformance,
  MarketMover,
  SearchResult,
  NewsArticle,
} from "./types";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const API_KEY = process.env.FMP_API_KEY;

async function fmpFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${FMP_BASE}${endpoint}`);
  url.searchParams.set("apikey", API_KEY!);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`FMP ${endpoint} failed: ${res.status}`);
  }

  return res.json();
}

interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  timestamp: number;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const data = await fmpFetch<FMPQuote[]>(`/quote/${encodeURIComponent(symbol)}`);
  const q = data[0];

  if (!q) throw new Error(`No FMP quote for ${symbol}`);

  return {
    symbol: q.symbol,
    name: q.name,
    price: q.price,
    change: q.change,
    changePercent: q.changesPercentage,
    volume: q.volume,
    previousClose: q.previousClose,
    open: q.open,
    high: q.dayHigh,
    low: q.dayLow,
    latestTradingDay: new Date(q.timestamp * 1000).toISOString().split("T")[0],
    source: "fmp",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getMultipleQuotes(symbols: string[]): Promise<Quote[]> {
  const joined = symbols.join(",");
  const data = await fmpFetch<FMPQuote[]>(`/quote/${encodeURIComponent(joined)}`);

  return data.map((q) => ({
    symbol: q.symbol,
    name: q.name,
    price: q.price,
    change: q.change,
    changePercent: q.changesPercentage,
    volume: q.volume,
    previousClose: q.previousClose,
    open: q.open,
    high: q.dayHigh,
    low: q.dayLow,
    latestTradingDay: new Date(q.timestamp * 1000).toISOString().split("T")[0],
    source: "fmp" as const,
    fetchedAt: new Date().toISOString(),
  }));
}

interface FMPHistorical {
  historical: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export async function getHistoricalPrices(
  symbol: string,
  from?: string,
  to?: string,
): Promise<HistoricalPrice[]> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const data = await fmpFetch<FMPHistorical>(
    `/historical-price-full/${encodeURIComponent(symbol)}`,
    params,
  );

  return (data.historical || []).map((h) => ({
    date: h.date,
    open: h.open,
    high: h.high,
    low: h.low,
    close: h.close,
    volume: h.volume,
  }));
}

interface FMPProfile {
  symbol: string;
  companyName: string;
  description: string;
  exchange: string;
  currency: string;
  country: string;
  sector: string;
  industry: string;
  mktCap: number;
  price: number;
  range: string;
  website: string;
  image: string;
  volAvg: number;
  lastDiv: number;
}

export async function getCompanyProfile(
  symbol: string,
): Promise<CompanyProfile | null> {
  const data = await fmpFetch<FMPProfile[]>(
    `/profile/${encodeURIComponent(symbol)}`,
  );
  const p = data[0];
  if (!p) return null;

  const [low52, high52] = (p.range || "0-0").split("-").map(Number);

  return {
    symbol: p.symbol,
    name: p.companyName,
    description: p.description,
    exchange: p.exchange,
    currency: p.currency,
    country: p.country,
    sector: p.sector,
    industry: p.industry,
    marketCap: p.mktCap,
    peRatio: null,
    dividendYield: p.lastDiv > 0 ? (p.lastDiv / p.price) * 100 : null,
    weekHigh52: high52 || 0,
    weekLow52: low52 || 0,
    avgVolume: p.volAvg,
    website: p.website,
    logo: p.image,
  };
}

export async function getSectorPerformance(): Promise<SectorPerformance[]> {
  const data = await fmpFetch<
    Array<{ sector: string; changesPercentage: string }>
  >("/sector-performance");

  return data.map((s) => ({
    sector: s.sector,
    changePercent: parseFloat(s.changesPercentage),
  }));
}

interface FMPMover {
  ticker: string;
  companyName: string;
  price: string;
  changes: string;
  changesPercentage: string;
}

export async function getGainers(): Promise<MarketMover[]> {
  const data = await fmpFetch<FMPMover[]>("/stock_market/gainers");
  return data.slice(0, 10).map((m) => ({
    symbol: m.ticker,
    name: m.companyName,
    price: parseFloat(m.price),
    change: parseFloat(m.changes),
    changePercent: parseFloat(m.changesPercentage.replace("%", "")),
  }));
}

export async function getLosers(): Promise<MarketMover[]> {
  const data = await fmpFetch<FMPMover[]>("/stock_market/losers");
  return data.slice(0, 10).map((m) => ({
    symbol: m.ticker,
    name: m.companyName,
    price: parseFloat(m.price),
    change: parseFloat(m.changes),
    changePercent: parseFloat(m.changesPercentage.replace("%", "")),
  }));
}

interface FMPSearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
  const data = await fmpFetch<FMPSearchResult[]>("/search", {
    query,
    limit: "10",
  });

  return data.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    exchange: r.exchangeShortName,
    type: "stock",
  }));
}

interface FMPNewsItem {
  title: string;
  text: string;
  publishedDate: string;
  site: string;
  url: string;
  image: string;
  symbol: string;
  tickers: string;
}

export async function getStockNews(
  tickers?: string,
  limit: number = 20,
): Promise<NewsArticle[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (tickers) params.tickers = tickers;

  const data = await fmpFetch<FMPNewsItem[]>("/stock_news", params);

  return data.map((item, idx) => ({
    id: `fmp-${idx}-${Date.now()}`,
    title: item.title,
    summary: item.text?.slice(0, 300) || "",
    source: item.site,
    sourceUrl: item.url,
    imageUrl: item.image || undefined,
    category: "equities" as const,
    relatedTickers: item.tickers ? item.tickers.split(",") : [],
    sentimentScore: null,
    publishedAt: item.publishedDate,
    fetchedAt: new Date().toISOString(),
  }));
}
