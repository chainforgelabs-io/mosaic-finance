"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/market-data/types";

interface IndexCardProps {
  quote: Quote;
  label?: string;
}

export function IndexCard({ quote, label }: IndexCardProps) {
  const isUp = quote.change > 0;
  const isDown = quote.change < 0;
  const isFlat = quote.change === 0;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4 hover:border-[var(--emerald)]/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] uppercase tracking-wide">
          {label || quote.symbol}
        </span>
        {isUp && <TrendingUp className="w-3.5 h-3.5 text-[var(--emerald)]" />}
        {isDown && <TrendingDown className="w-3.5 h-3.5 text-[var(--error)]" />}
        {isFlat && <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
      </div>

      <div className="flex items-end justify-between">
        <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)] tabular-nums">
          ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className="text-right">
          <span
            className={cn(
              "font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums",
              isUp && "text-[var(--emerald)]",
              isDown && "text-[var(--error)]",
              isFlat && "text-[var(--text-muted)]",
            )}
          >
            {isUp ? "+" : ""}
            {quote.changePercent.toFixed(2)}%
          </span>
          <p
            className={cn(
              "font-[family-name:var(--font-body)] text-xs tabular-nums",
              isUp && "text-[var(--emerald)]",
              isDown && "text-[var(--error)]",
              isFlat && "text-[var(--text-muted)]",
            )}
          >
            {isUp ? "+" : ""}
            {quote.change.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function IndexCardSkeleton() {
  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4 animate-pulse">
      <div className="h-3 w-20 bg-[var(--warm-100)] rounded mb-3" />
      <div className="flex items-end justify-between">
        <div className="h-6 w-24 bg-[var(--warm-100)] rounded" />
        <div className="h-4 w-14 bg-[var(--warm-100)] rounded" />
      </div>
    </div>
  );
}
