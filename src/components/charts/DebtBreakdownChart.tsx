"use client";

import { usePlanStore } from "@/stores/plan-store";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#6366f1", "#64748b", "#ec4899"];

interface ParsedDebt {
  name: string;
  amount: number;
  rate: string;
}

function parseDebtString(s: string): ParsedDebt {
  const nameMatch = s.match(/^([^(]+)/);
  const amountMatch = s.match(/\$([0-9,]+)/);
  const rateMatch = s.match(/([\d.]+%)/);
  return {
    name: nameMatch?.[1]?.trim() ?? s,
    amount: amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0,
    rate: rateMatch?.[1] ?? "",
  };
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export function DebtBreakdownChart() {
  const rawPlanData = usePlanStore((s) => s.rawPlanData);
  const debtPlan = rawPlanData?.debt_elimination_plan as Record<string, unknown> | undefined;

  if (!debtPlan) return null;

  const avalanche = debtPlan.avalanche_method as Record<string, unknown> | undefined;
  const order = (avalanche?.order as string[]) ?? [];
  const totalDebt = (debtPlan.total_debt as number) ?? 0;
  const payoffMonths = (avalanche?.payoff_months as number) ?? 0;
  const totalInterest = (avalanche?.total_interest_paid as number) ?? 0;
  const method = (debtPlan.recommended_method as string) ?? "Avalanche";

  const debts = order.map(parseDebtString).filter((d) => d.amount > 0);
  if (debts.length === 0) return null;

  const data = debts.map((d) => ({ name: d.name, amount: d.amount, rate: d.rate }));

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)]">
          Debt Breakdown
        </h3>
        <span className="font-[family-name:var(--font-body)] text-xs font-medium text-white bg-[var(--emerald)] px-2 py-0.5 rounded-full">
          {method}
        </span>
      </div>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-4">
        Total: {fmtCompact(totalDebt)} &middot; Payoff: {payoffMonths} months &middot; Interest: {fmtCompact(totalInterest)}
      </p>

      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => fmtCompact(Number(value))}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={28}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex gap-3">
        {debts.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
              {d.rate}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
