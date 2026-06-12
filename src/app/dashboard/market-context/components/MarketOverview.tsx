"use client";

import { useMarketStore } from "@/stores/market-store";
import {
  useMarketQuotes,
  useMarketMovers,
  useSectors,
  useWatchlist,
} from "../hooks/useMarketQuotes";
import { IndexCard, IndexCardSkeleton } from "./IndexCard";
import { MarketMovers } from "./MarketMovers";
import { SectorHeatmap } from "./SectorHeatmap";
import { RefreshCw, Plus, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Cards track ETF proxies — labels surface the ETF symbol so prices are
// read as ETF prices, not index levels.
const INDEX_LABELS: Record<string, string> = {
  SPY: "S&P 500 · SPY",
  EWC: "Canada · EWC",
  QQQ: "NASDAQ 100 · QQQ",
  DIA: "Dow Jones · DIA",
  AGG: "US Bonds · AGG",
  GLD: "Gold · GLD",
};

export function MarketOverview() {
  const {
    indexQuotes,
    indexQuotesLoading,
    indexQuotesError,
    movers,
    moversLoading,
    sectors,
    sectorsLoading,
  } = useMarketStore();

  const { refetch } = useMarketQuotes();
  useMarketMovers();
  useSectors();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const [watchlistInput, setWatchlistInput] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  }

  function handleAddWatchlist(e: React.FormEvent) {
    e.preventDefault();
    if (watchlistInput.trim()) {
      addToWatchlist(watchlistInput.trim().toUpperCase());
      setWatchlistInput("");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)]">
            Market Indices
          </h2>
          {indexQuotes.length > 0 && (
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mt-0.5">
              ETF proxies · delayed quotes · as of{" "}
              {new Date(indexQuotes[0].fetchedAt).toLocaleTimeString("en-CA", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={indexQuotesLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--warm-200)] text-[var(--text-secondary)] hover:bg-[var(--warm-50)] transition-colors font-[family-name:var(--font-body)] text-xs font-medium disabled:opacity-50"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      {/* Index cards grid */}
      {indexQuotesError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="font-[family-name:var(--font-body)] text-sm text-red-700">
            {indexQuotesError}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {indexQuotesLoading && indexQuotes.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <IndexCardSkeleton key={i} />
            ))
          : indexQuotes.map((quote) => (
              <IndexCard
                key={quote.symbol}
                quote={quote}
                label={INDEX_LABELS[quote.symbol] || quote.name}
              />
            ))}
      </div>

      {/* Watchlist */}
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[var(--warning)]" />
            <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
              Watchlist
            </h3>
          </div>
          <form onSubmit={handleAddWatchlist} className="flex items-center gap-2">
            <input
              type="text"
              value={watchlistInput}
              onChange={(e) => setWatchlistInput(e.target.value)}
              placeholder="Add symbol..."
              className="w-28 px-2.5 py-1 rounded-md border border-[var(--warm-200)] font-[family-name:var(--font-body)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--emerald)] uppercase"
            />
            <button
              type="submit"
              className="p-1 rounded-md border border-[var(--warm-200)] text-[var(--text-muted)] hover:text-[var(--emerald)] hover:border-[var(--emerald)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {watchlist.length === 0 ? (
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] py-3 text-center">
            Add symbols to track them here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {watchlist.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--warm-50)] border border-[var(--warm-200)] font-[family-name:var(--font-body)] text-xs font-medium text-[var(--text-primary)]"
              >
                {item.symbol}
                <button
                  onClick={() => removeFromWatchlist(item.symbol)}
                  className="text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Movers + Sectors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MarketMovers
            gainers={movers.gainers}
            losers={movers.losers}
            loading={moversLoading}
          />
        </div>
        <div>
          <SectorHeatmap sectors={sectors} loading={sectorsLoading} />
        </div>
      </div>
    </div>
  );
}
