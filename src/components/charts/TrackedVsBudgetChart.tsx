"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthPoint } from "@/lib/tracking/budget-kpis";
import { formatCompact, formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";

type Series = "income" | "expense" | "savings";

const SERIES: Array<{ key: Series; label: string; color: string; planned: keyof MonthPoint }> = [
  { key: "income", label: "Income", color: "#059669", planned: "plannedIncome" },
  { key: "expense", label: "Expenses", color: "#dc2626", planned: "plannedExpense" },
  { key: "savings", label: "Savings", color: "#0284c7", planned: "plannedSavings" },
];

export function TrackedVsBudgetChart({
  data,
  year,
  highlightMonth,
}: {
  data: MonthPoint[];
  year: number;
  highlightMonth?: string | null;
}) {
  const [shown, setShown] = useState<Record<Series, boolean>>({ income: true, expense: true, savings: true });
  const [showPlan, setShowPlan] = useState(true);
  const hasAny = data.some((point) => point.income || point.expense || point.savings);

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">Tracked vs plan</h3>
          <p className="font-body text-xs text-[var(--text-muted)]">
            Each month of {year}. Lighter bars are what you planned.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {SERIES.map((series) => (
            <button
              key={series.key}
              type="button"
              onClick={() => setShown((prev) => ({ ...prev, [series.key]: !prev[series.key] }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-xs font-semibold",
                shown[series.key]
                  ? "border-transparent bg-[var(--warm-100)] text-[var(--text-primary)]"
                  : "border-[var(--warm-200)] text-[var(--text-muted)] line-through",
              )}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPlan((value) => !value)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-display text-xs font-semibold",
              showPlan
                ? "border-transparent bg-[var(--warm-100)] text-[var(--text-primary)]"
                : "border-[var(--warm-200)] text-[var(--text-muted)] line-through",
            )}
          >
            Plan
          </button>
        </div>
      </div>
      {!hasAny ? (
        <p className="mt-4 font-body text-sm text-[var(--text-muted)]">Nothing logged in {year} yet.</p>
      ) : (
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }} barGap={1} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--warm-100)" />
              <XAxis
                dataKey="label"
                tick={({ x, y, payload }) => {
                  const point = data[payload.index as number];
                  const active = highlightMonth != null && point?.month === highlightMonth;
                  return (
                    <text
                      x={x}
                      y={Number(y) + 12}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={active ? 700 : 400}
                      fill={active ? "var(--text-primary)" : "var(--text-secondary)"}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCompact}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {SERIES.filter((series) => shown[series.key]).map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={series.color}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={22}
                />
              ))}
              {showPlan &&
                SERIES.filter((series) => shown[series.key]).map((series) => (
                  <Bar
                    key={`${series.key}-plan`}
                    dataKey={series.planned}
                    name={`${series.label} plan`}
                    fill={series.color}
                    fillOpacity={0.25}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={22}
                  />
                ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
