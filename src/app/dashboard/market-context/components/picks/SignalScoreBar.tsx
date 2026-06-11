"use client";

import { cn } from "@/lib/utils";

export function SignalScoreBar({ score }: { score: number | null }) {
  const value = score ?? 0;
  const color =
    value >= 65
      ? "bg-[var(--emerald)]"
      : value >= 40
        ? "bg-amber-400"
        : "bg-[var(--warm-200)]";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--warm-100)]">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="font-[family-name:var(--font-display)] text-xs font-semibold tabular-nums text-[var(--text-primary)]">
        {score === null ? "—" : Math.round(value)}
      </span>
    </div>
  );
}

export function OutlookBadge({ outlook }: { outlook: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    very_bullish: { label: "Very bullish", cls: "bg-emerald-100 text-emerald-800" },
    bullish: { label: "Bullish", cls: "bg-emerald-50 text-[var(--emerald)]" },
    neutral: { label: "Neutral", cls: "bg-gray-100 text-[var(--text-muted)]" },
    bearish: { label: "Bearish", cls: "bg-red-50 text-[var(--error)]" },
    very_bearish: { label: "Very bearish", cls: "bg-red-100 text-red-800" },
  };
  const c = config[outlook] || config.neutral;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        c.cls,
      )}
    >
      {c.label}
    </span>
  );
}
