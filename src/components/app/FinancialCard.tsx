"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import type { FinancialCardData } from "@/types";

export function FinancialCard({ label, value, unit, trend, trendDirection }: FinancialCardData) {
  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6 hover:shadow-sm transition-shadow">
      <p className="font-[family-name:var(--font-body)] text-[13px] font-normal text-[var(--text-muted)] uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-body)] text-[28px] font-semibold text-[var(--text-primary)] tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
            {unit}
          </span>
        )}
      </div>
      {trend && (
        <div className="mt-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              trendDirection === "up"
                ? "bg-[var(--emerald-soft)] text-[var(--emerald-dark)]"
                : "bg-red-50 text-red-600"
            }`}
          >
            {trendDirection === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}
