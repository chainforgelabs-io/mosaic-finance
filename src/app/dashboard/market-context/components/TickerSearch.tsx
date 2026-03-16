"use client";

import { Search, Loader2 } from "lucide-react";
import { useMarketStore } from "@/stores/market-store";
import { useStockSearch } from "../hooks/useStockSearch";
import { useRef, useState } from "react";

export function TickerSearch() {
  const { searchResults, searchLoading, setSelectedSymbol } = useMarketStore();
  const { searchQuery, setSearchQuery } = useStockSearch();
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(symbol: string) {
    setSelectedSymbol(symbol);
    setSearchQuery("");
    setShowDropdown(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Search stocks, ETFs... (e.g. AAPL, XIU.TO)"
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[var(--warm-200)] bg-white font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--emerald)] focus:ring-1 focus:ring-[var(--emerald)]/20"
        />
        {searchLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
        )}
      </div>

      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[var(--warm-200)] rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {searchResults.map((result) => (
            <button
              key={result.symbol}
              onMouseDown={() => handleSelect(result.symbol)}
              className="w-full text-left px-4 py-2.5 hover:bg-[var(--warm-50)] transition-colors flex items-center justify-between border-b border-[var(--warm-200)] last:border-b-0"
            >
              <div>
                <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
                  {result.symbol}
                </span>
                <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] truncate max-w-[260px]">
                  {result.name}
                </p>
              </div>
              <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] shrink-0 ml-2">
                {result.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
