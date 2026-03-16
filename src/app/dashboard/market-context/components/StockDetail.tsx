"use client";

import { useMarketStore } from "@/stores/market-store";
import { useCompanyData } from "../hooks/useStockSearch";
import { PriceChart } from "./PriceChart";
import { ArrowLeft, Globe, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Timeframe } from "@/lib/market-data/types";

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--warm-100)] last:border-b-0">
      <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--text-primary)] tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function StockDetail() {
  const {
    selectedSymbol,
    setSelectedSymbol,
    companyProfile,
    companyProfileLoading,
    historicalPrices,
    historicalLoading,
  } = useMarketStore();

  const { loadTimeframe } = useCompanyData(selectedSymbol);
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("1M");

  function handleTimeframeChange(tf: Timeframe) {
    setActiveTimeframe(tf);
    loadTimeframe(tf);
  }

  if (!selectedSymbol) return null;

  if (companyProfileLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 bg-[var(--warm-100)] rounded" />
        <div className="h-48 bg-[var(--warm-100)] rounded-lg" />
        <div className="h-32 bg-[var(--warm-100)] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedSymbol(null)}
          className="p-1.5 rounded-lg border border-[var(--warm-200)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--warm-50)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {companyProfile?.logo && (
            <img
              src={companyProfile.logo}
              alt={companyProfile.name}
              className="w-8 h-8 rounded-lg object-contain bg-[var(--warm-50)]"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-display)] font-bold text-lg text-[var(--text-primary)]">
                {selectedSymbol}
              </h2>
              {companyProfile?.exchange && (
                <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] px-2 py-0.5 bg-[var(--warm-50)] rounded">
                  {companyProfile.exchange}
                </span>
              )}
            </div>
            {companyProfile?.name && (
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
                {companyProfile.name}
              </p>
            )}
          </div>
        </div>
        {companyProfile?.website && (
          <a
            href={companyProfile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg border border-[var(--warm-200)] text-[var(--text-muted)] hover:text-[var(--emerald)] hover:border-[var(--emerald)] transition-colors"
          >
            <Globe className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Price chart */}
      <PriceChart
        prices={historicalPrices}
        loading={historicalLoading}
        activeTimeframe={activeTimeframe}
        onTimeframeChange={handleTimeframeChange}
      />

      {/* Key stats */}
      {companyProfile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
            <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] mb-3">
              Key Statistics
            </h3>
            <StatItem
              label="Market Cap"
              value={formatMarketCap(companyProfile.marketCap)}
            />
            <StatItem
              label="P/E Ratio"
              value={companyProfile.peRatio?.toFixed(2) || "N/A"}
            />
            <StatItem
              label="Dividend Yield"
              value={
                companyProfile.dividendYield
                  ? `${companyProfile.dividendYield.toFixed(2)}%`
                  : "N/A"
              }
            />
            <StatItem
              label="Avg Volume"
              value={companyProfile.avgVolume?.toLocaleString() || "N/A"}
            />
          </div>

          <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
            <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] mb-3">
              52-Week Range
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-[var(--error)]" />
                <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
                  Low
                </span>
                <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                  ${companyProfile.weekLow52.toFixed(2)}
                </span>
              </div>
              <div className="flex-1 h-1.5 bg-[var(--warm-100)] rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-[var(--emerald)]")}
                  style={{
                    width: `${
                      companyProfile.weekHigh52 > companyProfile.weekLow52
                        ? ((historicalPrices[0]?.close || 0) - companyProfile.weekLow52) /
                          (companyProfile.weekHigh52 - companyProfile.weekLow52) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[var(--emerald)]" />
                <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
                  High
                </span>
                <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                  ${companyProfile.weekHigh52.toFixed(2)}
                </span>
              </div>
            </div>
            <StatItem label="Sector" value={companyProfile.sector || "N/A"} />
            <StatItem label="Industry" value={companyProfile.industry || "N/A"} />
            <StatItem label="Country" value={companyProfile.country || "N/A"} />
          </div>
        </div>
      )}

      {/* Description */}
      {companyProfile?.description && (
        <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] mb-2">
            About
          </h3>
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4">
            {companyProfile.description}
          </p>
        </div>
      )}
    </div>
  );
}
