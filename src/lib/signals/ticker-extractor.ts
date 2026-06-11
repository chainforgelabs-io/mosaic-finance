import { Redis } from "@upstash/redis";
import { getAllSymbols } from "@/lib/market-data/fmp";

function getRedis(): Redis | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  ) {
    return null;
  }
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

const SYMBOLS_CACHE_KEY = "market:symbols:set";
/** 24h — matches Phase 1 spec */
const SYMBOLS_TTL_SEC = 86_400;

const CASHTAG_RE = /\$([A-Z]{1,5})(?![A-Z])/g;

/**
 * Extract cashtagged tickers ($AAPL — US-style uppercase symbols only).
 * Phase 1: ignores plain uppercase words to reduce false positives.
 */
export function extractCashtags(text: string): string[] {
  const found: string[] = [];
  const re = new RegExp(CASHTAG_RE.source, CASHTAG_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sym = m[1];
    if (sym.length >= 1 && sym.length <= 5) {
      found.push(sym);
    }
  }
  return [...new Set(found)];
}

async function refreshSymbolCache(): Promise<Set<string>> {
  const symbols = await getAllSymbols();
  const upper = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const redisClient = getRedis();
  if (redisClient) {
    try {
      await redisClient.set(SYMBOLS_CACHE_KEY, JSON.stringify(upper), {
        ex: SYMBOLS_TTL_SEC,
      });
    } catch {
      // Redis failure — still return in-memory set for this request
    }
  }
  return new Set(upper);
}

/**
 * Loads FMP stock list, cached in Upstash Redis 24h.
 */
export async function loadValidSymbols(): Promise<Set<string>> {
  const redisClient = getRedis();
  if (!redisClient) {
    return refreshSymbolCache();
  }
  try {
    const raw = await redisClient.get<string>(SYMBOLS_CACHE_KEY);
    if (raw) {
      const parsed =
        typeof raw === "string" ? (JSON.parse(raw) as string[]) : ([] as string[]);
      return new Set(parsed.map((s) => s.toUpperCase()));
    }
  } catch {
    // Fall through to FMP fetch
  }
  return refreshSymbolCache();
}

export async function extractAndValidate(text: string): Promise<{
  tickers: string[];
  raw: string[];
}> {
  const raw = extractCashtags(text);
  if (raw.length === 0) {
    return { tickers: [], raw: [] };
  }
  const valid = await loadValidSymbols();
  const tickers = raw.filter((s) => valid.has(s.toUpperCase()));
  return {
    raw,
    tickers: [...new Set(tickers)],
  };
}

const TICKER_SHAPE_RE = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;

/**
 * Validate candidate symbols against the FMP universe. If the universe
 * cannot be loaded (missing key, outage), fall back to shape validation
 * so ingestion never hard-fails on a data-vendor hiccup.
 */
export async function validateTickers(candidates: string[]): Promise<string[]> {
  const cleaned = [
    ...new Set(
      candidates
        .map((c) => c.trim().toUpperCase().replace(/^\$/, ""))
        .filter((c) => TICKER_SHAPE_RE.test(c)),
    ),
  ];
  if (cleaned.length === 0) return [];
  try {
    const valid = await loadValidSymbols();
    if (valid.size === 0) return cleaned;
    return cleaned.filter((c) => valid.has(c));
  } catch {
    return cleaned;
  }
}
