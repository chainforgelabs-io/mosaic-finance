import {
  classifyNewsCategory,
  type Quote,
  type HistoricalPrice,
  type CompanyProfile,
  type SectorPerformance,
  type MarketMover,
  type SearchResult,
  type NewsArticle,
} from "./types";

/**
 * FMP client targeting the current `/stable/` API. The legacy `/api/v3/`
 * endpoints return 403 for accounts created after FMP's API migration.
 * Some stable endpoints are plan-gated: callers treat empty results as
 * "panel unavailable" rather than an error.
 */
const FMP_BASE = "https://financialmodelingprep.com/stable";
const API_KEY = process.env.FMP_API_KEY;

class FMPAccessError extends Error {
  constructor(endpoint: string, status: number) {
    super(`FMP ${endpoint} failed: ${status}`);
    this.name = "FMPAccessError";
  }
}

async function fmpFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
  init?: RequestInit,
): Promise<T> {
  const url = new URL(`${FMP_BASE}${endpoint}`);
  url.searchParams.set("apikey", API_KEY!);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    ...(init ?? { next: { revalidate: 300 } }),
  });

  if (!res.ok) {
    throw new FMPAccessError(endpoint, res.status);
  }

  return res.json();
}

/** Plan-gated endpoints: swallow 402/403 and return a fallback. */
async function fmpFetchOptional<T>(
  endpoint: string,
  fallback: T,
  params: Record<string, string> = {},
): Promise<T> {
  try {
    return await fmpFetch<T>(endpoint, params);
  } catch (error) {
    if (
      error instanceof FMPAccessError &&
      /failed: (402|403)$/.test(error.message)
    ) {
      return fallback;
    }
    throw error;
  }
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace("%", ""));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

interface FMPQuote {
  symbol: string;
  name?: string;
  price?: number;
  // stable uses changePercentage; legacy used changesPercentage
  changePercentage?: number | string;
  changesPercentage?: number | string;
  change?: number;
  dayLow?: number;
  dayHigh?: number;
  volume?: number;
  open?: number;
  previousClose?: number;
  timestamp?: number;
}

function mapQuote(q: FMPQuote): Quote {
  return {
    symbol: q.symbol,
    name: q.name || q.symbol,
    price: num(q.price),
    change: num(q.change),
    changePercent: num(q.changePercentage ?? q.changesPercentage),
    volume: num(q.volume),
    previousClose: num(q.previousClose),
    open: num(q.open),
    high: num(q.dayHigh),
    low: num(q.dayLow),
    latestTradingDay: q.timestamp
      ? new Date(q.timestamp * 1000).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    source: "fmp",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getQuote(symbol: string): Promise<Quote> {
  const data = await fmpFetch<FMPQuote[]>("/quote", { symbol });
  const q = data[0];
  if (!q) throw new Error(`No FMP quote for ${symbol}`);
  return mapQuote(q);
}

export async function getMultipleQuotes(symbols: string[]): Promise<Quote[]> {
  const data = await fmpFetch<FMPQuote[]>("/batch-quote", {
    symbols: symbols.join(","),
  });
  return (data || []).map(mapQuote);
}

interface FMPHistoricalRow {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export async function getHistoricalPrices(
  symbol: string,
  from?: string,
  to?: string,
): Promise<HistoricalPrice[]> {
  const params: Record<string, string> = { symbol };
  if (from) params.from = from;
  if (to) params.to = to;

  const data = await fmpFetch<
    FMPHistoricalRow[] | { historical?: FMPHistoricalRow[] }
  >("/historical-price-eod/full", params);

  // stable returns a flat array; tolerate legacy {historical} wrapper
  const rows = Array.isArray(data) ? data : data.historical || [];

  return rows.map((h) => ({
    date: h.date,
    open: num(h.open),
    high: num(h.high),
    low: num(h.low),
    close: num(h.close),
    volume: num(h.volume),
  }));
}

interface FMPProfile {
  symbol: string;
  companyName?: string;
  description?: string;
  exchange?: string;
  exchangeFullName?: string;
  currency?: string;
  country?: string;
  sector?: string;
  industry?: string;
  // stable: marketCap / averageVolume / lastDividend; legacy: mktCap / volAvg / lastDiv
  marketCap?: number;
  mktCap?: number;
  volume?: number;
  price?: number;
  range?: string;
  website?: string;
  image?: string;
  averageVolume?: number;
  volAvg?: number;
  lastDividend?: number;
  lastDiv?: number;
}

export async function getCompanyProfile(
  symbol: string,
): Promise<CompanyProfile | null> {
  const data = await fmpFetch<FMPProfile[]>("/profile", { symbol });
  const p = data[0];
  if (!p) return null;

  const [low52, high52] = (p.range || "0-0").split("-").map(Number);
  const lastDividend = num(p.lastDividend ?? p.lastDiv);
  const price = num(p.price);

  return {
    symbol: p.symbol,
    name: p.companyName || p.symbol,
    description: p.description || "",
    exchange: p.exchange || p.exchangeFullName || "",
    currency: p.currency || "USD",
    country: p.country || "",
    sector: p.sector || "",
    industry: p.industry || "",
    marketCap: num(p.marketCap ?? p.mktCap),
    peRatio: null,
    dividendYield:
      lastDividend > 0 && price > 0 ? (lastDividend / price) * 100 : null,
    weekHigh52: high52 || 0,
    weekLow52: low52 || 0,
    avgVolume: num(p.averageVolume ?? p.volAvg),
    volume: num(p.volume),
    website: p.website || "",
    logo: p.image || "",
  };
}

interface FMPSectorSnapshot {
  sector: string;
  averageChange?: number | string;
  changesPercentage?: number | string;
  exchange?: string;
}

export async function getSectorPerformance(): Promise<SectorPerformance[]> {
  const today = new Date().toISOString().split("T")[0];
  const data = await fmpFetchOptional<FMPSectorSnapshot[]>(
    "/sector-performance-snapshot",
    [],
    { date: today },
  );

  // Snapshot returns one row per sector per exchange — average across exchanges
  const bySector = new Map<string, { sum: number; count: number }>();
  for (const row of data || []) {
    if (!row.sector) continue;
    const change = num(row.averageChange ?? row.changesPercentage);
    const entry = bySector.get(row.sector) || { sum: 0, count: 0 };
    entry.sum += change;
    entry.count += 1;
    bySector.set(row.sector, entry);
  }

  return [...bySector.entries()].map(([sector, { sum, count }]) => ({
    sector,
    changePercent: count > 0 ? sum / count : 0,
  }));
}

interface FMPMover {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changesPercentage?: number | string;
  changePercentage?: number | string;
}

function mapMover(m: FMPMover): MarketMover {
  return {
    symbol: m.symbol,
    name: m.name || m.symbol,
    price: num(m.price),
    change: num(m.change),
    changePercent: num(m.changePercentage ?? m.changesPercentage),
  };
}

export async function getGainers(): Promise<MarketMover[]> {
  const data = await fmpFetchOptional<FMPMover[]>("/biggest-gainers", []);
  return (data || []).slice(0, 10).map(mapMover);
}

export async function getLosers(): Promise<MarketMover[]> {
  const data = await fmpFetchOptional<FMPMover[]>("/biggest-losers", []);
  return (data || []).slice(0, 10).map(mapMover);
}

interface FMPSearchResult {
  symbol: string;
  name?: string;
  currency?: string;
  exchange?: string;
  exchangeFullName?: string;
  stockExchange?: string;
  exchangeShortName?: string;
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
  const data = await fmpFetch<FMPSearchResult[]>("/search-symbol", {
    query,
    limit: "10",
  });

  return (data || []).map((r) => ({
    symbol: r.symbol,
    name: r.name || r.symbol,
    exchange: r.exchange || r.exchangeShortName || r.exchangeFullName || "",
    type: "stock",
  }));
}

interface FMPNewsItem {
  title?: string;
  text?: string;
  publishedDate?: string;
  site?: string;
  publisher?: string;
  url?: string;
  image?: string;
  symbol?: string;
  tickers?: string;
}

export async function getStockNews(
  tickers?: string,
  limit: number = 20,
): Promise<NewsArticle[]> {
  const data = tickers
    ? await fmpFetchOptional<FMPNewsItem[]>("/news/stock", [], {
        symbols: tickers,
        limit: String(limit),
      })
    : await fmpFetchOptional<FMPNewsItem[]>("/news/stock-latest", [], {
        page: "0",
        limit: String(limit),
      });

  return (data || [])
    .filter((item) => item.title)
    .map((item, idx) => ({
      id: `fmp-${idx}-${Date.now()}`,
      title: item.title!,
      summary: item.text?.slice(0, 300) || "",
      source: item.site || item.publisher || "FMP",
      sourceUrl: item.url || "",
      imageUrl: item.image || undefined,
      category: classifyNewsCategory(item.title!, item.text),
      relatedTickers: item.symbol
        ? [item.symbol]
        : item.tickers
          ? item.tickers.split(",")
          : [],
      sentimentScore: null,
      publishedAt: item.publishedDate || new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    }));
}

interface FMPStockListRow {
  symbol: string;
  companyName?: string;
  name?: string;
}

/** Full ticker symbol universe (large payload). Bypass Next route cache when used inside jobs. */
export async function getAllSymbols(): Promise<string[]> {
  if (!API_KEY) {
    throw new Error("FMP_API_KEY is not set");
  }
  const rows = await fmpFetch<FMPStockListRow[]>("/stock-list", {}, {
    cache: "no-store",
  });
  const set = new Set<string>();
  for (const row of rows) {
    if (row?.symbol && typeof row.symbol === "string") {
      set.add(row.symbol.toUpperCase());
    }
  }
  return [...set];
}
