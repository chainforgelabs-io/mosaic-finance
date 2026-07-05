export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  latestTradingDay: string;
  source: "finnhub" | "fmp" | "alpha_vantage";
  fetchedAt: string;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  description: string;
  exchange: string;
  currency: string;
  country: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null;
  weekHigh52: number;
  weekLow52: number;
  avgVolume: number;
  /** Today's cumulative volume (FMP only; 0 when unavailable). */
  volume: number;
  website: string;
  logo: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  category: NewsCategory;
  relatedTickers: string[];
  sentimentScore: number | null;
  publishedAt: string;
  fetchedAt: string;
}

export type NewsCategory =
  | "macro"
  | "equities"
  | "crypto"
  | "commodities"
  | "canadian"
  | "general";

export type NewsPeriod = "today" | "week" | "month";

const CATEGORY_RULES: [RegExp, NewsCategory][] = [
  [/\b(crypto|bitcoin|btc|ethereum|eth|blockchain|defi|nft|altcoin|stablecoin|binance|coinbase)\b/i, "crypto"],
  [/\b(oil|crude|gold|silver|copper|natural gas|commodity|commodities|wheat|lumber|palladium|platinum|wti|brent)\b/i, "commodities"],
  [/\b(tsx|canada|canadian|bank of canada|loonie|cad|toronto stock|bmo|td bank|rbc|scotiabank|cibc|shopify\.to|enbridge)\b/i, "canadian"],
  [/\b(fed|federal reserve|inflation|gdp|unemployment|interest rate|treasury|cpi|ppi|fomc|monetary policy|fiscal|recession|tariff|trade war|jobs report|payroll|central bank|economic)\b/i, "macro"],
];

export function classifyNewsCategory(title: string, summary?: string): NewsCategory {
  const text = `${title} ${summary || ""}`;
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(text)) return category;
  }
  return "general";
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface SocialPost {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  timestamp: string;
  likes: number;
  reposts: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface SocialSentiment {
  topic: string;
  posts: SocialPost[];
  overallSentiment: "bullish" | "bearish" | "neutral";
  summary: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  addedAt: string;
}

export interface InvestorCommentary {
  id: string;
  persona: PersonaSlug;
  modelUsed: "sonnet" | "opus";
  outlook: "very_bullish" | "bullish" | "neutral" | "bearish" | "very_bearish";
  summary: string;
  keyThemes: string[];
  riskAssessment: string;
  actionableInsights: string[];
  generatedAt: string;
  period: "daily" | "weekly";
}

export type PersonaSlug =
  | "ray_dalio"
  | "warren_buffett"
  | "cathie_wood"
  | "howard_marks"
  | "peter_lynch"
  | "canadian_perspective"
  | "michael_burry"
  | "charlie_munger"
  | "benjamin_graham"
  | "jim_simons"
  | "george_soros"
  | "jack_bogle"
  | "mark_schmehl"
  | "david_dudding"
  | "john_templeton"
  | "jesse_livermore";

export interface NewsletterEdition {
  id: string;
  periodStart: string;
  periodEnd: string;
  marketRecap: string;
  topMovers: MarketMover[];
  newsSummary: string;
  aiHighlights: string[];
  generatedAt: string;
  sentAt: string | null;
}
