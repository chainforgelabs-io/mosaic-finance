import { createServiceClient } from "@/lib/supabase/service";
import { validateTickers } from "./ticker-extractor";
import { insertRawSignals, type RawSignalInsert } from "./store";

/**
 * Free congress-trade ingestion from the open-source Senate/House Stock
 * Watcher datasets (STOCK Act filings, published as S3 JSON dumps).
 * URLs are env-overridable so a paid source (Quiver etc.) can be swapped
 * in later without code changes.
 */

const SENATE_URL =
  process.env.SENATE_TRADES_URL ||
  "https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json";
const HOUSE_URL =
  process.env.HOUSE_TRADES_URL ||
  "https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json";

const LOOKBACK_DAYS = 60;

interface SenateTx {
  transaction_date: string; // "01/25/2021"
  ticker: string;
  type: string; // "Purchase" | "Sale (Full)" | "Sale (Partial)" | "Exchange"
  amount: string;
  senator: string;
  ptr_link: string;
  asset_description: string;
}

interface HouseTx {
  transaction_date: string; // "2021-01-25"
  ticker: string;
  type: string; // "purchase" | "sale_full" | "sale_partial" | "exchange"
  amount: string;
  representative: string;
  ptr_link: string;
  asset_description: string;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // MM/DD/YYYY (senate) or YYYY-MM-DD (house)
  const us = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const date = us ? new Date(`${us[3]}-${us[1]}-${us[2]}`) : new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

function txDirection(type: string): 1 | -1 | null {
  const t = type.toLowerCase();
  if (t.includes("purchase")) return 1;
  if (t.includes("sale")) return -1;
  return null; // exchanges/other ignored
}

async function fetchJson<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function registerMembers(
  names: Map<string, "senate" | "house">,
): Promise<Set<string>> {
  const supabase = createServiceClient();

  const { data: existing, error } = await supabase
    .from("tracked_congress_members")
    .select("full_name, active");
  if (error) throw error;

  const known = new Map(
    (existing || []).map((m) => [m.full_name.toLowerCase(), m.active as boolean]),
  );

  const newRows = [...names.entries()]
    .filter(([name]) => !known.has(name.toLowerCase()))
    .map(([name, chamber]) => ({
      full_name: name,
      chamber,
      source: "stock-watcher",
      active: true,
    }));

  if (newRows.length > 0) {
    const { error: insertErr } = await supabase
      .from("tracked_congress_members")
      .insert(newRows);
    if (insertErr) throw insertErr;
  }

  // Inactive members are excluded from signals
  const inactive = new Set(
    (existing || [])
      .filter((m) => m.active === false)
      .map((m) => (m.full_name as string).toLowerCase()),
  );
  return inactive;
}

export async function ingestCongressTrades(): Promise<{
  tradesIngested: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 86400_000);

  const [senateResult, houseResult] = await Promise.allSettled([
    fetchJson<SenateTx>(SENATE_URL),
    fetchJson<HouseTx>(HOUSE_URL),
  ]);

  type Normalized = {
    name: string;
    chamber: "senate" | "house";
    ticker: string;
    direction: 1 | -1;
    date: Date;
    amount: string;
    link: string;
    description: string;
  };
  const normalized: Normalized[] = [];

  if (senateResult.status === "fulfilled") {
    for (const tx of senateResult.value) {
      const date = parseDate(tx.transaction_date);
      const direction = txDirection(tx.type || "");
      if (!date || date < cutoff || !direction || !tx.ticker) continue;
      normalized.push({
        name: tx.senator,
        chamber: "senate",
        ticker: tx.ticker,
        direction,
        date,
        amount: tx.amount || "",
        link: tx.ptr_link || "",
        description: tx.asset_description || "",
      });
    }
  } else {
    errors.push(`senate feed: ${senateResult.reason}`);
  }

  if (houseResult.status === "fulfilled") {
    for (const tx of houseResult.value) {
      const date = parseDate(tx.transaction_date);
      const direction = txDirection(tx.type || "");
      if (!date || date < cutoff || !direction || !tx.ticker) continue;
      normalized.push({
        name: tx.representative,
        chamber: "house",
        ticker: tx.ticker,
        direction,
        date,
        amount: tx.amount || "",
        link: tx.ptr_link || "",
        description: tx.asset_description || "",
      });
    }
  } else {
    errors.push(`house feed: ${houseResult.reason}`);
  }

  if (normalized.length === 0) {
    return { tradesIngested: 0, errors };
  }

  const memberNames = new Map<string, "senate" | "house">();
  for (const tx of normalized) {
    if (tx.name) memberNames.set(tx.name, tx.chamber);
  }
  let inactiveMembers = new Set<string>();
  try {
    inactiveMembers = await registerMembers(memberNames);
  } catch (err) {
    errors.push(
      `member registry: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  const rows: RawSignalInsert[] = [];
  for (const tx of normalized) {
    if (inactiveMembers.has(tx.name.toLowerCase())) continue;
    const tickers = await validateTickers([tx.ticker]);
    if (tickers.length === 0) continue;
    const ticker = tickers[0];
    const dateStr = tx.date.toISOString().slice(0, 10);

    rows.push({
      source: "congress",
      source_id: `${tx.chamber}-${tx.name}-${ticker}-${dateStr}-${tx.direction}`,
      ticker,
      author_handle: tx.name,
      content:
        `${tx.name} (${tx.chamber}) ${tx.direction === 1 ? "bought" : "sold"} ${ticker} (${tx.amount}) — ${tx.description}`.slice(
          0,
          2000,
        ),
      url: tx.link || null,
      sentiment: tx.direction,
      occurred_at: tx.date.toISOString(),
    });
  }

  const tradesIngested = await insertRawSignals(rows);
  return { tradesIngested, errors };
}
