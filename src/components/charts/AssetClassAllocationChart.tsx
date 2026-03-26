"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { classifyHolding, type AssetClass } from "@/lib/asset-classification";

const ASSET_CLASS_ORDER: AssetClass[] = [
  "Canadian Equity",
  "US Equity",
  "International Equity",
  "Fixed Income",
  "Cash & Short-Term",
  "Alternatives",
  "Unclassified",
];

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  "Canadian Equity": "#059669",
  "US Equity": "#10b981",
  "International Equity": "#34d399",
  "Fixed Income": "#2563eb",
  "Cash & Short-Term": "#f59e0b",
  Alternatives: "#7c3aed",
  Unclassified: "#94a3b8",
};

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

export function AssetClassAllocationChart({ accounts }: { accounts: AccountRow[] }) {
  const totals: Record<AssetClass, number> = {
    "Canadian Equity": 0,
    "US Equity": 0,
    "International Equity": 0,
    "Fixed Income": 0,
    "Cash & Short-Term": 0,
    Alternatives: 0,
    Unclassified: 0,
  };

  for (const acc of accounts) {
    for (const h of acc.holdings) {
      const cls = classifyHolding(h.ticker ?? "", h.name ?? "");
      totals[cls] += h.balance ?? 0;
    }
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  if (grandTotal <= 0) {
    return (
      <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
          By Asset Class
        </h3>
        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-4">
          Holdings grouped by asset class
        </p>
        <div className="flex items-center justify-center h-[170px]">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)] text-center">
            No balance data to chart
          </p>
        </div>
      </div>
    );
  }

  const data = ASSET_CLASS_ORDER.filter((k) => totals[k] > 0).map((name) => ({
    name,
    value: totals[name],
    pct: Math.round((totals[name] / grandTotal) * 100),
  }));

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)] mb-1">
        By Asset Class
      </h3>
      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)] mb-4">
        Estimated mix from ticker mapping &amp; holding names
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
                {data.map((entry) => (
                  <Cell key={entry.name} fill={ASSET_CLASS_COLORS[entry.name as AssetClass]} />
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
          {data.map((entry) => (
            <li key={entry.name} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ASSET_CLASS_COLORS[entry.name as AssetClass] }}
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
        Total: {fmtFull(grandTotal)}
      </p>
    </div>
  );
}
