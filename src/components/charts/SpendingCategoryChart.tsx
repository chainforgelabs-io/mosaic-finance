"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  SPENDING_CATEGORY_COLORS,
  SPENDING_CATEGORY_LABELS,
  type SpendingCategory,
} from "@/lib/tracking/categories";
import { formatMoney } from "@/lib/tracking/format";

interface Slice {
  category: SpendingCategory;
  amount: number;
}

export function SpendingCategoryChart({ data }: { data: Slice[] }) {
  const slices = data.filter((d) => d.amount > 0);
  if (slices.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
        <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">
          This week by category
        </h3>
        <p className="font-body text-sm text-[var(--text-muted)]">No spending logged this week yet.</p>
      </div>
    );
  }

  const chartData = slices.map((s) => ({
    name: SPENDING_CATEGORY_LABELS[s.category],
    value: s.amount,
    color: SPENDING_CATEGORY_COLORS[s.category],
  }));
  const total = slices.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
      <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">
        This week by category
      </h3>
      <p className="mb-4 font-body text-xs text-[var(--text-muted)]">
        {formatMoney(total)} total
      </p>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {chartData.map((entry) => (
            <li key={entry.name} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="flex-1 truncate font-body text-sm text-[var(--text-secondary)]">
                {entry.name}
              </span>
              <span className="font-body text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {formatMoney(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
