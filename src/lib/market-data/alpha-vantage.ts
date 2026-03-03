import { createClient } from '@/lib/supabase/server';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const CACHE_TTL_HOURS = 4;

export interface MarketQuote {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  volume: string;
  latestTradingDay: string;
}

export interface MarketContextData {
  tsx: Record<string, unknown>;
  sp500: Record<string, unknown>;
  bonds: Record<string, unknown>;
  fetchedAt: string;
}

function parseGlobalQuote(raw: Record<string, unknown>): MarketQuote | null {
  const gq = raw?.['Global Quote'] as Record<string, string> | undefined;
  if (!gq || !gq['01. symbol']) return null;
  return {
    symbol: gq['01. symbol'],
    price: gq['05. price'],
    change: gq['09. change'],
    changePercent: gq['10. change percent'],
    volume: gq['06. volume'],
    latestTradingDay: gq['07. latest trading day'],
  };
}

async function fetchQuote(symbol: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`,
    { next: { revalidate: CACHE_TTL_HOURS * 3600 } },
  );
  return res.json();
}

export async function getETFInfo(ticker: string) {
  const res = await fetch(
    `${ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${API_KEY}`,
  );
  return res.json();
}

export async function getMarketContext(): Promise<MarketContextData> {
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from('market_context_reports')
    .select('content, valid_until')
    .gt('valid_until', new Date().toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (cached) return cached.content as MarketContextData;

  try {
    const [tsx, sp500, bonds] = await Promise.all([
      fetchQuote('XIU.TO'),
      fetchQuote('SPY'),
      fetchQuote('ZAG.TO'),
    ]);

    const marketData: MarketContextData = {
      tsx,
      sp500,
      bonds,
      fetchedAt: new Date().toISOString(),
    };

    const validUntil = new Date(
      Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000,
    ).toISOString();

    await supabase.from('market_context_reports').insert({
      content: marketData,
      valid_until: validUntil,
    });

    return marketData;
  } catch (error) {
    const { data: stale } = await supabase
      .from('market_context_reports')
      .select('content')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (stale) return stale.content as MarketContextData;
    throw error;
  }
}

export function formatQuoteSummary(data: MarketContextData) {
  const tsxQuote = parseGlobalQuote(data.tsx);
  const sp500Quote = parseGlobalQuote(data.sp500);
  const bondsQuote = parseGlobalQuote(data.bonds);

  return {
    tsx: tsxQuote,
    sp500: sp500Quote,
    bonds: bondsQuote,
    fetchedAt: data.fetchedAt,
  };
}
