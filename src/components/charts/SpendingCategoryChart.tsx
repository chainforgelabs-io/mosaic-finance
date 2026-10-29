"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { categoryColor, categoryLabel } from "@/lib/tracking/categories";
import { formatMoney } from "@/lib/tracking/format";
import { cn } from "@/lib/utils";

interface Slice {
  category: string;
  amount: number;
}

const VISIBLE_SLICES = 6;
const REST_COLOR = "#d6d3d1";

export function summarizeCategorySlices(data: Slice[], limit = VISIBLE_SLICES): { shown: Slice[]; rest: Slice[] } {
  const slices = data
    .filter((slice) => slice.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  if (slices.length <= limit + 1) return { shown: slices, rest: [] };
  return { shown: slices.slice(0, limit), rest: slices.slice(limit) };
}

export function SpendingCategoryChart({
  data,
  title = "This week by category",
  emptyLabel = "No spending logged this week yet.",
}: {
  data: Slice[];
  title?: string;
  emptyLabel?: string;
}) {
  const { shown, rest } = summarizeCategorySlices(data);
  const [restOpen, setRestOpen] = useState(false);
  if (shown.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
        <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="font-body text-sm text-[var(--text-muted)]">{emptyLabel}</p>
      </div>
    );
  }

  const restTotal = rest.reduce((sum, slice) => sum + slice.amount, 0);
  const chartData = [
    ...shown.map((slice) => ({
      name: categoryLabel(slice.category),
      value: slice.amount,
      color: categoryColor(slice.category),
    })),
    ...(rest.length > 0 ? [{ name: "Everything else", value: restTotal, color: REST_COLOR }] : []),
  ];
  const total = chartData.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
      <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mb-4 font-body text-xs text-[var(--text-muted)]">{formatMoney(total)} total</p>
      <div className="mx-auto h-[160px] w-[160px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} dataKey="value" stroke="none">
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
      <ul className="mt-4 space-y-1.5">
        {shown.map((slice) => (
          <LegendRow
            key={slice.category}
            label={categoryLabel(slice.category)}
            amount={slice.amount}
            color={categoryColor(slice.category)}
          />
        ))}
        {rest.length > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setRestOpen((open) => !open)}
              aria-expanded={restOpen}
              className="flex w-full items-center gap-2 text-left"
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: REST_COLOR }} />
              <span className="min-w-0 flex-1 font-body text-sm text-[var(--text-secondary)]">Everything else</span>
              <span className="font-body text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {formatMoney(restTotal)}
              </span>
              <ChevronDown className={cn("size-4 shrink-0 text-[var(--text-muted)] transition", restOpen && "rotate-180")} />
            </button>
            {restOpen && (
              <ul className="mt-1.5 space-y-1.5 pl-4">
                {rest.map((slice) => (
                  <LegendRow
                    key={slice.category}
                    label={categoryLabel(slice.category)}
                    amount={slice.amount}
                    color={categoryColor(slice.category)}
                  />
                ))}
              </ul>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

function LegendRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1 font-body text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="font-body text-sm font-semibold tabular-nums text-[var(--text-primary)]">{formatMoney(amount)}</span>
    </li>
  );
}
