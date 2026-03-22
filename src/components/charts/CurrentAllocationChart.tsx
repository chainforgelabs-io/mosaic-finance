"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getAccountLabel } from "@/lib/schemas/holdings";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#64748b", "#14b8a6", "#f97316"];

interface Holding {
  ticker: string;
  name: string;
  balance: number;
}

interface AccountRow {
  account_type: string;
  holdings: Holding[];
  total_value: number;
}

function fmtFull(n: number | null | undefined): string {
  if (n == null) return "--";
  return `$${n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CurrentAllocationChart() {
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);

  useEffect(() => {
    fetch("/api/holdings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.holdings) setAccounts(data.holdings);
      })
      .catch(() => {});
  }, []);

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
          Current Portfolio Mix
        </h3>
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-4">
          Actual allocation from your accounts
        </p>
        <div className="flex items-center justify-center h-[170px]">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] text-center">
            Upload statements or add holdings<br />to see your current allocation
          </p>
        </div>
      </div>
    );
  }

  const totalValue = accounts.reduce((s, a) => s + a.total_value, 0);
  if (totalValue === 0) return null;

  const data = accounts.map((a) => ({
    name: getAccountLabel(a.account_type),
    value: a.total_value,
    pct: Math.round((a.total_value / totalValue) * 100),
  }));

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
        Current Portfolio Mix
      </h3>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-4">
        Actual allocation across your accounts
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
                formatter={(value) => fmtFull(Number(value))}
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
                {entry.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--text-muted)] mt-3 text-right">
        Total: {fmtFull(totalValue)}
      </p>
    </div>
  );
}
