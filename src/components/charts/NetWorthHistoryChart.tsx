"use client";

import { useState } from "react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatMoney } from "@/lib/tracking/format";
import { formatMonthLabel } from "@/lib/tracking/dates";
import { cn } from "@/lib/utils";

interface Point {
  date: string;
  netWorth: number;
  assets?: number;
  liabilities?: number;
}

type Series = "netWorth" | "assets" | "liabilities";

const SERIES: Array<{ key: Series; label: string; color: string }> = [
  { key: "netWorth", label: "Net worth", color: "#10b981" },
  { key: "assets", label: "Assets", color: "#6366f1" },
  { key: "liabilities", label: "Liabilities", color: "#ef4444" },
];

export function NetWorthHistoryChart({
  data,
  title = "Net worth history",
  subtitle = "From your monthly check-ins",
  showToggles = false,
  height = 200,
}: {
  data: Point[];
  title?: string;
  subtitle?: string;
  /** Show Net worth / Assets / Liabilities toggles. Needs assets and liabilities on each point. */
  showToggles?: boolean;
  height?: number;
}) {
  const [shown, setShown] = useState<Record<Series, boolean>>({ netWorth: true, assets: false, liabilities: false });
  const hasSeries = data.some((d) => d.assets != null || d.liabilities != null);
  const toggles = showToggles && hasSeries;

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
        <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="font-body text-sm text-[var(--text-muted)]">
          Save a monthly snapshot to start a real history — not just a projection.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: formatMonthLabel(d.date).replace(/ \d{4}$/, ""),
    netWorth: d.netWorth,
    assets: d.assets,
    liabilities: d.liabilities,
  }));

  const visible = toggles ? SERIES.filter((s) => shown[s.key]) : SERIES.filter((s) => s.key === "netWorth");

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="font-body text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
        {toggles && (
          <div className="flex flex-wrap items-center gap-1.5">
            {SERIES.map((series) => (
              <button
                key={series.key}
                type="button"
                onClick={() =>
                  setShown((prev) => {
                    const next = { ...prev, [series.key]: !prev[series.key] };
                    return Object.values(next).some(Boolean) ? next : prev;
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-xs font-semibold",
                  shown[series.key]
                    ? "border-transparent bg-[var(--warm-100)] text-[var(--text-primary)]"
                    : "border-[var(--warm-200)] text-[var(--text-muted)]",
                )}
                aria-pressed={shown[series.key]}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: series.color }} />
                {series.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="nwHistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--warm-100)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompact}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(value, name) => [toggles ? formatMoney(Number(value)) : formatCompact(Number(value)), String(name)]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
            {toggles && visible.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {visible.some((s) => s.key === "netWorth") && (
              <Area
                type="monotone"
                dataKey="netWorth"
                name="Net worth"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#nwHistGrad)"
                dot={{ r: 3, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              />
            )}
            {visible
              .filter((s) => s.key !== "netWorth")
              .map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: series.color, stroke: "#fff", strokeWidth: 1.5 }}
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
