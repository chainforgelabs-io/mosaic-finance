"use client";

import { useMarketStore } from "@/stores/market-store";
import { TickerSearch } from "./TickerSearch";
import { StockDetail } from "./StockDetail";
import { Search } from "lucide-react";

export function StockLookup() {
  const { selectedSymbol } = useMarketStore();

  return (
    <div className="space-y-6">
      <TickerSearch />

      {selectedSymbol ? (
        <StockDetail />
      ) : (
        <div className="flex items-center justify-center py-16 text-center">
          <div>
            <div className="w-12 h-12 rounded-lg bg-[var(--warm-50)] flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <p className="font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--text-primary)]">
              Search for a stock or ETF
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
              Look up US and Canadian securities by ticker symbol or company name. View price charts, key stats, and company details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
