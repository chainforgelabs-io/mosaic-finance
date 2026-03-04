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
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--warm-200)] bg-white p-6 transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <p className="font-body text-[13px] font-normal uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-body text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
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
