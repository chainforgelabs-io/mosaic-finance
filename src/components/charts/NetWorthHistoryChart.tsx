"use client";

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { formatCompact } from "@/lib/tracking/format";
import { formatMonthLabel } from "@/lib/tracking/dates";

interface Point {
  date: string;
  netWorth: number;
}

export function NetWorthHistoryChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
        <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">
          Net worth history
        </h3>
        <p className="font-body text-sm text-[var(--text-muted)]">
          Save a monthly snapshot to start a real history — not just a projection.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: formatMonthLabel(d.date).replace(/ \d{4}$/, ""),
    netWorth: d.netWorth,
  }));

  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-6">
      <h3 className="mb-1 font-display text-base font-semibold text-[var(--text-primary)]">
        Net worth history
      </h3>
      <p className="mb-4 font-body text-xs text-[var(--text-muted)]">From your monthly check-ins</p>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
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
              formatter={(value) => formatCompact(Number(value))}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#nwHistGrad)"
              dot={{ r: 3, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
