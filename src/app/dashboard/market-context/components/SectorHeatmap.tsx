"use client";

import { cn } from "@/lib/utils";
import type { SectorPerformance } from "@/lib/market-data/types";

interface SectorHeatmapProps {
  sectors: SectorPerformance[];
  loading: boolean;
}

export function SectorHeatmap({ sectors, loading }: SectorHeatmapProps) {
  if (loading) {
    return (
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4 animate-pulse">
        <div className="h-4 w-36 bg-[var(--warm-100)] rounded mb-4" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 bg-[var(--warm-50)] rounded mb-2" />
        ))}
      </div>
    );
  }

  const sorted = [...sectors].sort(
    (a, b) => b.changePercent - a.changePercent,
  );
  const maxAbs = Math.max(
    ...sorted.map((s) => Math.abs(s.changePercent)),
    1,
  );

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] mb-4">
        Sector Performance
      </h3>
      <div className="space-y-2">
        {sorted.map((sector) => {
          const isUp = sector.changePercent > 0;
          const barWidth = Math.min(
            (Math.abs(sector.changePercent) / maxAbs) * 100,
            100,
          );

          return (
            <div key={sector.sector} className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)] w-28 shrink-0 truncate">
                {sector.sector}
              </span>
              <div className="flex-1 h-5 bg-[var(--warm-50)] rounded-full overflow-hidden relative">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isUp ? "bg-[var(--emerald)]/20" : "bg-[var(--error)]/20",
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span
                className={cn(
                  "font-[family-name:var(--font-body)] text-xs font-semibold tabular-nums w-14 text-right shrink-0",
                  isUp ? "text-[var(--emerald)]" : "text-[var(--error)]",
                )}
              >
                {isUp ? "+" : ""}
                {sector.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
        {sectors.length === 0 && (
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] py-4 text-center">
            No sector data available
          </p>
        )}
      </div>
    </div>
  );
}
