import type { MarketMover, Quote } from "@/lib/market-data/types";

const PENNY_PRICE = 5;
const MAX_ABS_PERCENT = 40;
const MIN_ABS_PERCENT = 1;
const FUND_NAME =
  /\b(fund|advisor|sai|class [a-z0-9]+|ordinary shares|warrant|unit trust)\b/i;

export function filterLiquidMovers(
  movers: MarketMover[],
  limit = 5,
): MarketMover[] {
  return movers
    .filter((m) => Number.isFinite(m.price) && m.price >= PENNY_PRICE)
    .filter((m) => Number.isFinite(m.changePercent))
    .filter((m) => {
      const abs = Math.abs(m.changePercent);
      return abs >= MIN_ABS_PERCENT && abs <= MAX_ABS_PERCENT;
    })
    .filter((m) => /^[A-Z]{1,5}$/.test(m.symbol.trim()))
    .filter((m) => !FUND_NAME.test(m.name || ""))
    .slice(0, limit);
}

export const CANADIAN_WATCHLIST: { symbol: string; name: string }[] = [
  { symbol: "SHOP", name: "Shopify" },
  { symbol: "RY", name: "Royal Bank" },
  { symbol: "TD", name: "TD Bank" },
  { symbol: "ENB", name: "Enbridge" },
  { symbol: "CNI", name: "CN Rail" },
  { symbol: "SU", name: "Suncor" },
];

export function sanitizeRecap(text: string): string {
  const stripped = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return firstSentences(stripped, 2);
}

export function firstSentences(text: string, count = 2): string {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches || matches.length === 0) {
    return text.length > 320 ? `${text.slice(0, 317).trim()}…` : text;
  }
  return matches.slice(0, count).join(" ").replace(/\s+/g, " ").trim();
}

export function percentCell(changePercent: number): { text: string; color: string } {
  const sign = changePercent > 0 ? "+" : "";
  return {
    text: `${sign}${changePercent.toFixed(2)}%`,
    color: changePercent >= 0 ? "#059669" : "#DC2626",
  };
}

export function quotesToRows(
  quotes: Quote[],
  names?: Record<string, string>,
): { symbol: string; name: string; changePercent: number }[] {
  return quotes
    .filter((q) => Number.isFinite(q.changePercent))
    .map((q) => ({
      symbol: q.symbol,
      name: names?.[q.symbol] ?? q.name ?? q.symbol,
      changePercent: q.changePercent,
    }));
}
