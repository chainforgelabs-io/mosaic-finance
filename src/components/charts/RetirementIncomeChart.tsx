"use client";

import { usePlanStore } from "@/stores/plan-store";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#10b981", "#059669", "#6366f1", "#f59e0b", "#64748b", "#ec4899", "#8b5cf6"];

interface IncomeSource {
  source: string;
  estimated_monthly: number;
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "--";
  return `$${n.toLocaleString()}`;
}

export function RetirementIncomeChart() {
  const rawPlanData = usePlanStore((s) => s.rawPlanData);
  const ret = rawPlanData?.retirement_readiness as Record<string, unknown> | undefined;
  const sources: IncomeSource[] = (ret?.retirement_income_sources as IncomeSource[]) ?? [];
  const numeric = sources.filter(
    (s) => s != null && typeof s.estimated_monthly === "number" && Number.isFinite(s.estimated_monthly),
  );

  if (numeric.length === 0) return null;

  const total = numeric.reduce((sum, s) => sum + s.estimated_monthly, 0);
  const data = numeric.map((s) => ({ name: s.source, value: s.estimated_monthly }));

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
        Retirement Income Sources
      </h3>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-4">
        Estimated monthly income at retirement
      </p>
      <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center">
        <div className="relative mx-auto size-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => fmt(Number(value))}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-[family-name:var(--font-display)] font-bold text-lg text-[var(--text-primary)]">
              {fmt(total)}
            </span>
            <span className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)]">
              /month
            </span>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-2">
          {data.map((entry, i) => (
            <li key={entry.name} className="flex items-start gap-2">
              <span
                className="mt-1.5 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="min-w-0 flex-1 font-[family-name:var(--font-body)] text-sm leading-snug text-[var(--text-secondary)]">
                {entry.name}
              </span>
              <span className="shrink-0 font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {fmt(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
