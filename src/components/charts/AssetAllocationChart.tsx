"use client";

import { usePlanStore } from "@/stores/plan-store";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#64748b"];
const LABELS: Record<string, string> = {
  canadian_equity: "Canadian Equity",
  us_equity: "US Equity",
  international_equity: "Int'l Equity",
  fixed_income: "Fixed Income",
  alternatives: "Alternatives",
};

export function AssetAllocationChart() {
  const rawPlanData = usePlanStore((s) => s.rawPlanData);
  const portfolio = rawPlanData?.investment_portfolio_blueprint as Record<string, unknown> | undefined;
  const allocation = portfolio?.recommended_allocation as Record<string, number> | undefined;

  if (!allocation) return null;

  const data = Object.entries(allocation).map(([key, value]) => ({
    name: LABELS[key] ?? key,
    value,
  }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
        Recommended Allocation
      </h3>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-4">
        Target portfolio asset mix based on your risk profile assessment
      </p>
      <div className="flex items-center gap-6">
        <div className="w-[170px] h-[170px] shrink-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${value}%`}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-2">
          {data.map((entry, i) => (
            <li key={entry.name} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)] flex-1">
                {entry.name}
              </span>
              <span className="font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {entry.value}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
