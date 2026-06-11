import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as fmp from "@/lib/market-data/fmp";
import {
  extractCashtags,
  extractAndValidate,
} from "@/lib/signals/ticker-extractor";

describe("extractCashtags", () => {
  it('extracts a single cashtag from "$NVDA is hot"', () => {
    expect(extractCashtags("$NVDA is hot")).toEqual(["NVDA"]);
  });

  it("dedupes multiple occurrences of same symbol", () => {
    expect(extractCashtags("$NVDA $NVDA $TSLA")).toEqual(["NVDA", "TSLA"]);
  });

  it("ignores plain uppercase tokens without $", () => {
    expect(extractCashtags("NVDA is hot")).toEqual([]);
  });

  it("ignores lowercase cashtags", () => {
    expect(extractCashtags("$nvda")).toEqual([]);
  });

  it("does not capture more than five letters after $", () => {
    expect(extractCashtags("$ABCDEF")).toEqual([]);
    expect(extractCashtags("$ABCDEFG")).toEqual([]);
  });
});

describe("extractAndValidate", () => {
  beforeEach(() => {
    vi.spyOn(fmp, "getAllSymbols").mockResolvedValue([
      "NVDA",
      "TSLA",
      "MSFT",
    ]);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("keeps symbols present in FMP universe", async () => {
    const out = await extractAndValidate("$NVDA and fake $ZZZZ fake");
    expect(out.raw).toEqual(["NVDA", "ZZZZ"]);
    expect(out.tickers).toEqual(["NVDA"]);
  });

  it("returns empty arrays when nothing cashtagged", async () => {
    const out = await extractAndValidate("no symbols here NVDA still plain");
    expect(out).toEqual({ tickers: [], raw: [] });
  });
});
