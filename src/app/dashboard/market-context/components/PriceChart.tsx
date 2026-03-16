"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { HistoricalPrice, Timeframe } from "@/lib/market-data/types";

interface PriceChartProps {
  prices: HistoricalPrice[];
  loading: boolean;
  activeTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "1Y", "5Y"];

function formatDate(dateStr: string, timeframe: Timeframe): string {
  const date = new Date(dateStr);
  if (timeframe === "1D" || timeframe === "1W") {
    return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }
  if (timeframe === "1M" || timeframe === "3M") {
    return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-CA", { year: "2-digit", month: "short" });
}

export function PriceChart({
  prices,
  loading,
  activeTimeframe,
  onTimeframeChange,
}: PriceChartProps) {
  const chartData = [...prices].reverse().map((p) => ({
    date: p.date,
    price: p.close,
    label: formatDate(p.date, activeTimeframe),
  }));

  const isUp =
    chartData.length >= 2 &&
    chartData[chartData.length - 1].price >= chartData[0].price;
  const color = isUp ? "var(--emerald)" : "var(--error)";

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
          Price History
        </h3>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={cn(
                "px-2.5 py-1 rounded-md font-[family-name:var(--font-body)] text-xs font-medium transition-colors",
                activeTimeframe === tf
                  ? "bg-[var(--emerald)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--warm-50)]",
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--emerald)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
            No price data available
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              width={55}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid var(--warm-200)",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-body)",
              }}
              formatter={(value: unknown) => [
                `$${Number(value).toFixed(2)}`,
                "Price",
              ]}
              labelFormatter={(label: unknown) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
