"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { formatCompact } from "@/lib/tracking/format";

interface Point {
  label: string;
  amount: number;
}

export function WeeklySpendChart({ data, baseline }: { data: Point[]; baseline?: number | null }) {
  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
      <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">
        Weekly spending
      </h3>
      <p className="mb-4 font-body text-xs text-[var(--text-muted)]">
        Last 8 weeks
        {baseline != null ? ` · baseline ${formatCompact(baseline)}/wk` : ""}
      </p>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--warm-100)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
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
              formatter={(value) => formatCompact(Number(value))}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
            <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
