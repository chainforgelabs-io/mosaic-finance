/**
 * Starter FinTwit accounts seeded in DB (mirrors supabase/migrations/023_stock_picks.sql).
 * Edit here + re-sync migration if changing the canonical list.
 */
export interface SeedXAccountRow {
  handle: string;
  displayName: string;
  category: string;
  weight: number;
}

export const SEED_X_ACCOUNTS: SeedXAccountRow[] = [
  { handle: "unusual_whales", displayName: "Unusual Whales", category: "flow", weight: 0.9 },
  { handle: "charliebilello", displayName: "Charlie Bilello", category: "macro", weight: 0.85 },
  { handle: "TheTranscript_", displayName: "The Transcript", category: "earnings", weight: 0.85 },
  { handle: "LizAnnSonders", displayName: "Liz Ann Sonders", category: "macro", weight: 0.85 },
  { handle: "sentimenttrader", displayName: "Sentiment Trader", category: "technicals", weight: 0.8 },
  { handle: "markminervini", displayName: "Mark Minervini", category: "technicals", weight: 0.85 },
  { handle: "RaoulGMI", displayName: "Raoul Pal", category: "macro", weight: 0.8 },
  { handle: "profplum99", displayName: "Plum (@profplum99)", category: "value", weight: 0.75 },
  { handle: "hkuppy", displayName: "Kuppy", category: "macro", weight: 0.8 },
  { handle: "Citrini7", displayName: "Citrini", category: "research", weight: 0.75 },
  { handle: "MebFaber", displayName: "Meb Faber", category: "macro", weight: 0.8 },
  { handle: "cliffordasness", displayName: "Cliff Asness", category: "quant", weight: 0.8 },
  { handle: "AndrewLokenauth", displayName: "Andrew Lokenauth", category: "education", weight: 0.7 },
  { handle: "PauloMacro", displayName: "PauloMacro", category: "macro", weight: 0.75 },
  {
    handle: "scion_capital",
    displayName: "Scion Asset (Michael Burry)",
    category: "value",
    weight: 0.85,
  },
  { handle: "zerohedge", displayName: "ZeroHedge", category: "news", weight: 0.65 },
  { handle: "LynAldenContact", displayName: "Lyn Alden", category: "macro", weight: 0.85 },
  { handle: "jposhaughnessy", displayName: "Jim O'Shaughnessy", category: "macro", weight: 0.75 },
  { handle: "MorganHousel", displayName: "Morgan Housel", category: "behavior", weight: 0.75 },
  { handle: "Hedgeye", displayName: "Hedgeye", category: "research", weight: 0.7 },
];
