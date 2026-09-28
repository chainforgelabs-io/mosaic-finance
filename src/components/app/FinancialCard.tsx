"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface FinancialCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendDirection?: "up" | "down";
  className?: string;
}

export function FinancialCard({
  label,
  value,
  unit,
  trend,
  trendDirection,
  className,
}: FinancialCardProps) {
  const longValue = value.trim().length > 14;

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-[var(--warm-200)] bg-white p-4 transition-shadow hover:shadow-sm sm:p-6",
        className,
      )}
    >
      <p className="break-words font-body text-[13px] font-normal uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-1.5">
        <span
          className={cn(
            "max-w-full font-body font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]",
            longValue ? "block text-[15px] leading-snug" : "text-[28px] tabular-nums",
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-body text-sm text-[var(--text-muted)]">
            {unit}
          </span>
        )}
      </div>
      {trend && trendDirection && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            trendDirection === "up"
              ? "bg-emerald-50 text-[var(--emerald-dark)]"
              : "bg-red-50 text-[var(--error)]",
          )}
        >
          {trendDirection === "up" ? (
            <TrendingUp className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          {trend}
        </div>
      )}
    </div>
  );
}
