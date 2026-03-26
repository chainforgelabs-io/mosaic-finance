/**
 * Static ticker → asset class mapping for common Canadian-listed ETFs and funds,
 * plus name-based fallbacks. Unknown tickers default to Unclassified.
 */

export type AssetClass =
  | "Canadian Equity"
  | "US Equity"
  | "International Equity"
  | "Fixed Income"
  | "Cash & Short-Term"
  | "Alternatives"
  | "Unclassified";

const TICKER_MAP: Record<string, AssetClass> = {
  // Canadian equity
  XIU: "Canadian Equity",
  XIC: "Canadian Equity",
  VCN: "Canadian Equity",
  ZCN: "Canadian Equity",
  HXT: "Canadian Equity",
  ZLB: "Canadian Equity",
  XDIV: "Canadian Equity",
  VIDY: "Canadian Equity",
  // US equity (CAD-listed wrappers)
  VFV: "US Equity",
  VUS: "US Equity",
  XUS: "US Equity",
  ZSP: "US Equity",
  HXS: "US Equity",
  HUL: "US Equity",
  VUN: "US Equity",
  XUU: "US Equity",
  ZUUS: "US Equity",
  QQC: "US Equity",
  // International equity
  XEF: "International Equity",
  VIU: "International Equity",
  ZEA: "International Equity",
  XEC: "International Equity",
  VEE: "International Equity",
  XAW: "International Equity",
  VXC: "International Equity",
  // All-in-one / balanced (equity-dominant — bucket as Canadian for simplicity)
  XEQT: "Canadian Equity",
  VEQT: "Canadian Equity",
  XGRO: "Canadian Equity",
  VGRO: "Canadian Equity",
  XBAL: "Canadian Equity",
  VBAL: "Canadian Equity",
  VCNS: "Canadian Equity",
  XCNS: "Canadian Equity",
  // Fixed income
  ZAG: "Fixed Income",
  XBB: "Fixed Income",
  VAB: "Fixed Income",
  ZFL: "Fixed Income",
  XLB: "Fixed Income",
  ZDB: "Fixed Income",
  VGV: "Fixed Income",
  BXF: "Fixed Income",
  // Cash & short-term / savings
  PSA: "Cash & Short-Term",
  CASH: "Cash & Short-Term",
  CSAV: "Cash & Short-Term",
  MNY: "Cash & Short-Term",
  HISA: "Cash & Short-Term",
  HSAV: "Cash & Short-Term",
  HISA_U: "Cash & Short-Term",
  // Alternatives / real assets
  VRE: "Alternatives",
  XRE: "Alternatives",
  ZRE: "Alternatives",
  CMR: "Alternatives",
  COM: "Alternatives",
};

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/\.TO$/i, "").replace(/\.CN$/i, "");
}

export function classifyHolding(ticker: string, name: string): AssetClass {
  const upper = normalizeTicker(ticker || "");
  if (upper && TICKER_MAP[upper]) {
    return TICKER_MAP[upper];
  }

  const lowerName = (name || "").toLowerCase();
  if (
    lowerName.includes("cash") ||
    lowerName.includes("money market") ||
    lowerName.includes("savings")
  ) {
    return "Cash & Short-Term";
  }
  if (
    lowerName.includes("bond") ||
    lowerName.includes("fixed income") ||
    lowerName.includes("aggregate") ||
    lowerName.includes("gic")
  ) {
    return "Fixed Income";
  }
  if (
    lowerName.includes("reit") ||
    lowerName.includes("real estate") ||
    lowerName.includes("commodit") ||
    lowerName.includes("gold fund")
  ) {
    return "Alternatives";
  }
  if (
    lowerName.includes("equity") ||
    lowerName.includes("stock") ||
    lowerName.includes("index fund") ||
    /\bindex\b/.test(lowerName)
  ) {
    return "Canadian Equity";
  }

  return "Unclassified";
}
