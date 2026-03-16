"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { MarketMover } from "@/lib/market-data/types";

interface MarketMoversProps {
  gainers: MarketMover[];
  losers: MarketMover[];
  loading: boolean;
}

function MoverRow({ mover, rank }: { mover: MarketMover; rank: number }) {
  const isUp = mover.change > 0;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--warm-50)] transition-colors">
      <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] w-4 text-right tabular-nums">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)] truncate">
          {mover.symbol}
        </p>
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] truncate">
          {mover.name}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)] tabular-nums">
          ${mover.price.toFixed(2)}
        </p>
        <p
          className={cn(
            "font-[family-name:var(--font-body)] text-xs font-medium tabular-nums inline-flex items-center gap-0.5",
            isUp ? "text-[var(--emerald)]" : "text-[var(--error)]",
          )}
        >
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isUp ? "+" : ""}
          {mover.changePercent.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

export function MarketMovers({ gainers, losers, loading }: MarketMoversProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white border border-[var(--warm-200)] rounded-lg p-4 animate-pulse">
            <div className="h-4 w-28 bg-[var(--warm-100)] rounded mb-4" />
            {[0, 1, 2, 3, 4].map((j) => (
              <div key={j} className="h-10 bg-[var(--warm-50)] rounded mb-2" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[var(--emerald)]" />
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
            Top Gainers
          </h3>
        </div>
        <div className="space-y-0.5">
          {gainers.slice(0, 5).map((mover, i) => (
            <MoverRow key={mover.symbol} mover={mover} rank={i + 1} />
          ))}
          {gainers.length === 0 && (
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] py-4 text-center">
              No data available
            </p>
          )}
        </div>
      </div>

      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-[var(--error)]" />
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
            Top Losers
          </h3>
        </div>
        <div className="space-y-0.5">
          {losers.slice(0, 5).map((mover, i) => (
            <MoverRow key={mover.symbol} mover={mover} rank={i + 1} />
          ))}
          {losers.length === 0 && (
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] py-4 text-center">
              No data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
