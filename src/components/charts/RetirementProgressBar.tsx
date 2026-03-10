"use client";

import { usePlanStore } from "@/stores/plan-store";

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export function RetirementProgressBar() {
  const rawPlanData = usePlanStore((s) => s.rawPlanData);
  const ret = rawPlanData?.retirement_readiness as Record<string, unknown> | undefined;

  const target = (ret?.retirement_number as number) ?? 0;
  const current = (ret?.current_trajectory as number) ?? 0;

  if (!target || !current) return null;

  const pct = Math.min(Math.round((current / target) * 100), 100);
  const gap = target - current;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
        Retirement Readiness
      </h3>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-5">
        Current trajectory vs. target retirement number
      </p>

      <div className="flex items-end justify-between mb-2">
        <span className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
          {pct}%
        </span>
        <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
          {fmtCompact(current)} of {fmtCompact(target)}
        </span>
      </div>

      <div className="w-full h-4 bg-[var(--warm-100)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: pct >= 80
              ? "linear-gradient(90deg, #10b981, #059669)"
              : pct >= 50
                ? "linear-gradient(90deg, #f59e0b, #d97706)"
                : "linear-gradient(90deg, #ef4444, #dc2626)",
          }}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 bg-[var(--warm-50)] border border-[var(--warm-200)] rounded-md px-4 py-3">
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-0.5">Gap to Close</p>
          <p className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--error)]">
            {fmtCompact(gap)}
          </p>
        </div>
        <div className="flex-1 bg-[var(--warm-50)] border border-[var(--warm-200)] rounded-md px-4 py-3">
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-0.5">Monthly Savings Needed</p>
          <p className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)]">
            {fmtCompact((ret?.monthly_savings_required as number) ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
