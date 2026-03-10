"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { AssetAllocationChart } from "@/components/charts/AssetAllocationChart";
import { DebtBreakdownChart } from "@/components/charts/DebtBreakdownChart";
import { FinancialCard } from "@/components/app/FinancialCard";
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Landmark,
  PiggyBank,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ---------- Types ---------- */

interface Holding {
  ticker: string;
  name: string;
  balance: number;
  units: number | null;
}

interface AccountRow {
  id: string;
  account_type: string;
  holdings: Holding[];
  total_value: number;
  source: string;
  created_at: string;
}

interface FinancialProfile {
  annual_income: number | null;
  monthly_expenses: number | null;
  monthly_savings: number | null;
  emergency_fund_months: number | null;
  major_debts: { type: string; amount: number; rate?: number; monthly_payment?: number }[] | null;
  financial_goals: { goal: string; target_amount?: number; target_year?: number }[] | null;
}

/* ---------- Helpers ---------- */

function fmt(n: number | null | undefined): string {
  if (n == null) return "--";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ACCOUNT_LABELS: Record<string, string> = {
  RRSP: "RRSP",
  TFSA: "TFSA",
  FHSA: "FHSA",
  "non-registered": "Non-Registered",
  pension: "Pension",
  LIRA: "LIRA",
  RESP: "RESP",
  "Non-Reg": "Non-Registered",
};

/* ---------- Account Card ---------- */

function AccountCard({ account }: { account: AccountRow }) {
  const [expanded, setExpanded] = useState(false);
  const label = ACCOUNT_LABELS[account.account_type] ?? account.account_type;

  return (
    <div className="bg-white border border-[var(--warm-200)] rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50">
            <Landmark className="size-4 text-[var(--emerald)]" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)]">
              {label}
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">
              {account.holdings.length} holding{account.holdings.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-display)] font-bold text-lg tabular-nums text-[var(--text-primary)]">
            {fmtFull(account.total_value)}
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="size-4 text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--warm-200)] px-5 py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--warm-100)]">
                  <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Holding
                  </th>
                  <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">
                    Units
                  </th>
                  <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {account.holdings.map((h, i) => (
                  <tr key={i} className="border-b border-[var(--warm-50)] last:border-0">
                    <td className="py-2.5">
                      <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                        {h.ticker || h.name || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="font-[family-name:var(--font-body)] text-sm tabular-nums text-[var(--text-secondary)]">
                        {h.units != null ? h.units.toLocaleString() : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="font-[family-name:var(--font-body)] text-sm font-medium tabular-nums text-[var(--text-primary)]">
                        {fmtFull(h.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Debt Row ---------- */

function parseDebtFromPlan(raw: string): { name: string; amount: number; rate: string } {
  const nameMatch = raw.match(/^([^(]+)/);
  const amountMatch = raw.match(/\$([0-9,]+)/);
  const rateMatch = raw.match(/([\d.]+%)/);
  return {
    name: nameMatch?.[1]?.trim() ?? raw,
    amount: amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0,
    rate: rateMatch?.[1] ?? "",
  };
}

/* ---------- Main Page ---------- */

export default function AssetsPage() {
  const { rawPlanData } = usePlanStore();
  const [holdings, setHoldings] = useState<AccountRow[]>([]);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/holdings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings ?? []);
        setProfile(data.financialProfile ?? null);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const diag = rawPlanData?.financial_health_diagnostic as Record<string, unknown> | undefined;
  const debtPlan = rawPlanData?.debt_elimination_plan as Record<string, unknown> | undefined;
  const avalanche = debtPlan?.avalanche_method as Record<string, unknown> | undefined;
  const debtOrder = (avalanche?.order as string[]) ?? [];

  const totalAssets = holdings.reduce((sum, a) => sum + a.total_value, 0);
  const totalDebt = (debtPlan?.total_debt as number) ?? (profile?.major_debts ?? []).reduce((s, d) => s + d.amount, 0);
  const netWorth = (diag?.net_worth as number) ?? totalAssets - totalDebt;

  const parsedDebts = debtOrder.map(parseDebtFromPlan).filter((d) => d.amount > 0);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
            Assets & Liabilities
          </h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--text-primary)]">
          Assets & Liabilities
        </h1>
        <Link
          href="/onboarding/holdings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] font-[family-name:var(--font-display)] text-sm font-semibold hover:bg-[var(--emerald)] hover:text-white transition-colors"
        >
          Edit Holdings
        </Link>
      </div>

      {/* NET WORTH SUMMARY */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinancialCard
            label="TOTAL ASSETS"
            value={fmt(totalAssets)}
            className="bg-gradient-to-br from-white to-emerald-50/40"
          />
          <FinancialCard
            label="TOTAL LIABILITIES"
            value={fmt(totalDebt)}
            className="bg-gradient-to-br from-white to-red-50/30"
          />
          <FinancialCard
            label="NET WORTH"
            value={fmt(netWorth)}
            className="bg-gradient-to-br from-white to-indigo-50/40"
          />
        </div>

        {/* ALLOCATION + ACCOUNTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetAllocationChart />
          <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-[var(--emerald)]" />
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-base text-[var(--text-primary)]">
                Account Summary
              </h3>
            </div>
            {holdings.length === 0 ? (
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-muted)]">
                No investment accounts on file.{" "}
                <Link href="/onboarding/holdings" className="text-[var(--emerald)] hover:underline">
                  Add accounts
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {holdings.map((account) => (
                  <div key={account.id} className="flex items-center justify-between py-2 border-b border-[var(--warm-50)] last:border-0">
                    <div className="flex items-center gap-2">
                      <Landmark className="size-3.5 text-[var(--text-muted)]" />
                      <span className="font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                        {ACCOUNT_LABELS[account.account_type] ?? account.account_type}
                      </span>
                    </div>
                    <span className="font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                      {fmtFull(account.total_value)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
                    Total
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--emerald)]">
                    {fmtFull(totalAssets)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INVESTMENT ACCOUNTS DETAIL */}
        {holdings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[var(--emerald)]" />
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">
                Investment Accounts
              </h2>
            </div>
            <div className="space-y-3">
              {holdings.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
        )}

        {/* DEBTS & LIABILITIES */}
        {(parsedDebts.length > 0 || (profile?.major_debts ?? []).length > 0) && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">
                Debts & Liabilities
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DebtBreakdownChart />
              <div className="bg-white border border-[var(--warm-200)] rounded-lg p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--warm-200)]">
                        <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Debt
                        </th>
                        <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">
                          Balance
                        </th>
                        <th className="pb-2 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">
                          Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedDebts.map((d) => (
                        <tr key={d.name} className="border-b border-[var(--warm-50)] last:border-0">
                          <td className="py-2.5 font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                            {d.name}
                          </td>
                          <td className="py-2.5 text-right font-[family-name:var(--font-body)] text-sm font-medium tabular-nums text-[var(--text-primary)]">
                            {fmtFull(d.amount)}
                          </td>
                          <td className="py-2.5 text-right">
                            {d.rate && (
                              <span className={cn(
                                "font-[family-name:var(--font-body)] text-xs font-medium px-2 py-0.5 rounded-full",
                                parseFloat(d.rate) >= 10 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600",
                              )}>
                                {d.rate}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {parsedDebts.length === 0 && (profile?.major_debts ?? []).map((d, i) => (
                        <tr key={i} className="border-b border-[var(--warm-50)] last:border-0">
                          <td className="py-2.5 font-[family-name:var(--font-body)] text-sm text-[var(--text-primary)]">
                            {d.type}
                          </td>
                          <td className="py-2.5 text-right font-[family-name:var(--font-body)] text-sm font-medium tabular-nums text-[var(--text-primary)]">
                            {fmtFull(d.amount)}
                          </td>
                          <td className="py-2.5 text-right">
                            {d.rate != null && (
                              <span className="font-[family-name:var(--font-body)] text-xs font-medium text-amber-600">
                                {d.rate}%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--warm-200)]">
                        <td className="pt-3 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)]">
                          Total
                        </td>
                        <td className="pt-3 text-right font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-red-600">
                          {fmtFull(totalDebt)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {avalanche?.payoff_months != null && (
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                    <p className="font-[family-name:var(--font-body)] text-sm text-[var(--emerald-dark)]">
                      <span className="font-semibold">Payoff timeline:</span> {String(avalanche.payoff_months)} months using the{" "}
                      {String(debtPlan?.recommended_method ?? "Avalanche")} method
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CASH FLOW */}
        {profile && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-[var(--emerald)]" />
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">
                Cash Flow Overview
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FinancialCard
                label="ANNUAL INCOME"
                value={fmt(profile.annual_income)}
                className="bg-gradient-to-br from-white to-emerald-50/40"
              />
              <FinancialCard
                label="MONTHLY EXPENSES"
                value={fmt(profile.monthly_expenses)}
                className="bg-gradient-to-br from-white to-red-50/30"
              />
              <FinancialCard
                label="MONTHLY SAVINGS"
                value={fmt(profile.monthly_savings)}
                className="bg-gradient-to-br from-white to-blue-50/40"
              />
              <div className="rounded-lg border border-[var(--warm-200)] p-6 bg-gradient-to-br from-white to-amber-50/40">
                <p className="font-body text-[13px] font-normal uppercase tracking-wider text-[var(--text-muted)]">
                  EMERGENCY FUND
                </p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-body text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {profile.emergency_fund_months ?? "--"}
                  </span>
                  <span className="font-body text-sm text-[var(--text-muted)]">months</span>
                </div>
                <div className="mt-3">
                  <div className="w-full h-2 bg-[var(--warm-100)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(((profile.emergency_fund_months ?? 0) / 6) * 100, 100)}%`,
                        background: (profile.emergency_fund_months ?? 0) >= 6
                          ? "var(--emerald)"
                          : (profile.emergency_fund_months ?? 0) >= 3
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    />
                  </div>
                  <p className="font-body text-[11px] text-[var(--text-muted)] mt-1">
                    Target: 6 months
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIAL GOALS */}
        {profile?.financial_goals && profile.financial_goals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PiggyBank className="w-5 h-5 text-[var(--emerald)]" />
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-[var(--text-primary)]">
                Financial Goals
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.financial_goals.map((g, i) => (
                <div
                  key={i}
                  className="bg-white border border-[var(--warm-200)] rounded-lg p-5 hover:shadow-sm transition-shadow"
                >
                  <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--text-primary)] mb-2">
                    {g.goal}
                  </p>
                  <div className="flex items-center gap-4">
                    {g.target_amount != null && (
                      <div>
                        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">Target</p>
                        <p className="font-[family-name:var(--font-body)] text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                          {fmt(g.target_amount)}
                        </p>
                      </div>
                    )}
                    {g.target_year != null && (
                      <div>
                        <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-muted)]">By</p>
                        <p className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--text-primary)]">
                          {g.target_year}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
