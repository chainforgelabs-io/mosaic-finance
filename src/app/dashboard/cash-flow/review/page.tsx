"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { TrackedVsBudgetChart } from "@/components/charts/TrackedVsBudgetChart";
import {
  CATEGORY_KIND_LABELS,
  categoryColor,
  labelFor,
  type UserCategory,
} from "@/lib/tracking/categories";
import {
  monthPeriod,
  monthlySeries,
  periodCompletion,
  savingsRate,
  trackedTotals,
  trackingBalance,
  varianceSections,
  yearPeriod,
  type CategoryVariance,
  type SavingsRateMode,
  type VarianceSection,
} from "@/lib/tracking/budget-kpis";
import { formatMonthLabel, startOfMonth, todayIso } from "@/lib/tracking/dates";
import { formatMoney } from "@/lib/tracking/format";
import { fetchCatalog, fetchPlan } from "@/lib/tracking/plan-client";
import type { PlanKind } from "@/lib/tracking/budget-plan";
import { cn } from "@/lib/utils";
import type { BudgetPlanEntry, TransactionRow } from "@/types/tracking";

const RATE_MODE_KEY = "mosaic-savings-rate-mode";

const KIND_TONE: Record<PlanKind, { header: string; bar: string }> = {
  income: { header: "bg-[var(--emerald-soft)] text-[var(--emerald-dark)]", bar: "bg-[var(--emerald)]" },
  expense: { header: "bg-red-50 text-red-800", bar: "bg-red-500" },
  savings: { header: "bg-sky-50 text-sky-800", bar: "bg-sky-600" },
};

const SAVINGS_PALETTE = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#0369a1"];
const INCOME_PALETTE = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#047857"];

function loadRateMode(): SavingsRateMode {
  if (typeof window === "undefined") return "active";
  return localStorage.getItem(RATE_MODE_KEY) === "passive" ? "passive" : "active";
}

async function loadYear(targetYear: number): Promise<{
  txns: TransactionRow[];
  plan: BudgetPlanEntry[];
  budgets: Record<string, number>;
  catalog: UserCategory[];
}> {
  const period = yearPeriod(targetYear);
  const [txnRes, planData, budgetRes, catalog] = await Promise.all([
    fetch(`/api/transactions?start=${period.start}&end=${period.end}`, { credentials: "include" }),
    fetchPlan(targetYear),
    fetch("/api/budgets", { credentials: "include" }),
    fetchCatalog(),
  ]);
  let txns: TransactionRow[] = [];
  if (txnRes.ok) {
    const json = await txnRes.json();
    txns = (json.transactions ?? []) as TransactionRow[];
  }
  const budgets: Record<string, number> = {};
  if (budgetRes.ok) {
    const json = await budgetRes.json();
    for (const b of json.budgets ?? []) budgets[b.category] = Number(b.monthly_limit);
  }
  return { txns, plan: planData.entries, budgets, catalog };
}

function pct(value: number | null, digits = 0): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export default function ReviewPage() {
  const today = todayIso();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState<string | "year">(() => startOfMonth(today));
  const [txns, setTxns] = useState<TransactionRow[]>([]);
  const [plan, setPlan] = useState<BudgetPlanEntry[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [catalog, setCatalog] = useState<UserCategory[]>([]);
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const loading = loadedYear !== year;
  const [rateMode, setRateMode] = useState<SavingsRateMode>("active");

  useEffect(() => {
    let cancelled = false;
    loadYear(year).then((data) => {
      if (cancelled) return;
      setTxns(data.txns);
      setPlan(data.plan);
      setBudgets(data.budgets);
      setCatalog(data.catalog);
      setRateMode(loadRateMode());
      setLoadedYear(year);
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const period = useMemo(() => (month === "year" ? yearPeriod(year) : monthPeriod(month)), [month, year]);
  const completion = periodCompletion(period, today);
  const totals = useMemo(() => trackedTotals(txns, period), [txns, period]);
  const balance = trackingBalance(totals);
  const rate = savingsRate(totals, rateMode);
  const sections = useMemo(() => varianceSections(txns, plan, period, budgets), [txns, plan, period, budgets]);
  const series = useMemo(() => monthlySeries(txns, plan, year), [txns, plan, year]);
  const months = useMemo(() => yearPeriod(year).months, [year]);
  const currentYear = Number(today.slice(0, 4));
  const hasPlan = plan.length > 0;

  function changeYear(next: number) {
    setYear(next);
    if (month !== "year") setMonth(`${next}-${month.slice(5, 7)}-01`);
  }

  function setMode(mode: SavingsRateMode) {
    setRateMode(mode);
    localStorage.setItem(RATE_MODE_KEY, mode);
  }

  const periodLabel = month === "year" ? `${year}` : formatMonthLabel(month);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Review</h1>
          <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
            What you tracked against what you planned, for a month or the whole year.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-[var(--warm-200)] bg-white">
            <button
              type="button"
              onClick={() => changeYear(year - 1)}
              className="rounded-l-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)]"
              aria-label="Previous year"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="px-2 font-display text-sm font-semibold tabular-nums">{year}</span>
            <button
              type="button"
              onClick={() => changeYear(year + 1)}
              disabled={year >= currentYear}
              className="rounded-r-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--warm-100)] disabled:opacity-30"
              aria-label="Next year"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value as string | "year")}
            className="rounded-lg border border-[var(--warm-200)] bg-white px-3 py-2 font-display text-sm font-semibold"
            aria-label="Period"
          >
            <option value="year">Whole year</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}T00:00:00`).toLocaleDateString("en-CA", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!loading && !hasPlan && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--warm-200)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-sm text-[var(--text-secondary)]">
            There is no plan for {year} yet, so the budget columns are empty. Tracked totals still show below.
          </p>
          <Link
            href="/dashboard/cash-flow/plan"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[var(--slate-950)] px-4 py-2 font-display text-sm font-semibold text-white"
          >
            Build the plan
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          label="Period complete"
          value={pct(completion)}
          hint={completion >= 1 ? `${periodLabel} is over` : completion <= 0 ? `${periodLabel} has not started` : `of ${periodLabel} has passed`}
        >
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--warm-100)]">
            <div className="h-full rounded-full bg-[var(--slate-950)]" style={{ width: `${Math.round(completion * 100)}%` }} />
          </div>
        </KpiTile>
        <KpiTile
          label="Tracking balance"
          value={formatMoney(balance)}
          tone={balance >= 0 ? "good" : "bad"}
          hint={balance >= 0 ? "income not yet spent or set aside" : "spent or set aside beyond tracked income"}
        />
        <KpiTile
          label="Savings rate"
          value={pct(rate, 1)}
          hint={
            rate == null
              ? "needs tracked income"
              : rateMode === "active"
                ? "set aside, as a share of income"
                : "not spent, as a share of income"
          }
        >
          <div className="mt-2 inline-flex rounded-full border border-[var(--warm-200)] p-0.5">
            {(["active", "passive"] as SavingsRateMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                className={cn(
                  "rounded-full px-2 py-0.5 font-display text-[11px] font-semibold",
                  rateMode === mode ? "bg-[var(--slate-950)] text-white" : "text-[var(--text-secondary)]",
                )}
              >
                {mode === "active" ? "Set aside" : "Not spent"}
              </button>
            ))}
          </div>
        </KpiTile>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {sections.map((section) => (
              <VarianceTable key={section.kind} section={section} catalog={catalog} />
            ))}
          </div>
          <div className="space-y-4">
            <TrackedVsBudgetChart data={series} year={year} highlightMonth={month === "year" ? null : month} />
            {sections.map((section) => (
              <KindDonut key={section.kind} section={section} catalog={catalog} periodLabel={periodLabel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  tone,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--warm-200)] bg-white px-4 py-3">
      <p className="font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-bold tabular-nums",
          tone === "bad" ? "text-red-700" : tone === "good" ? "text-[var(--emerald-dark)]" : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </p>
      {hint && <p className="font-body text-[11px] text-[var(--text-muted)]">{hint}</p>}
      {children}
    </div>
  );
}

function VarianceTable({ section, catalog }: { section: VarianceSection; catalog: UserCategory[] }) {
  const tone = KIND_TONE[section.kind];
  const isIncome = section.kind === "income";
  if (section.rows.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--warm-200)] bg-white">
      <div className={cn("flex items-center justify-between px-4 py-2", tone.header)}>
        <h2 className="font-display text-sm font-semibold">{CATEGORY_KIND_LABELS[section.kind]}</h2>
        <span className="font-body text-xs">
          {isIncome ? "Tracked · Plan · Above plan" : "Tracked · Budget · Remaining · Excess"}
        </span>
      </div>
      <div className="hidden grid-cols-[minmax(120px,1.6fr)_repeat(4,minmax(70px,1fr))] gap-2 border-b border-[var(--warm-100)] px-4 py-1.5 font-body text-[11px] uppercase tracking-wider text-[var(--text-muted)] sm:grid">
        <span>Category</span>
        <span className="text-right">Tracked</span>
        <span className="text-right">{isIncome ? "Plan" : "Budget"}</span>
        <span className="text-right">{isIncome ? "% of plan" : "% used"}</span>
        <span className="text-right">{isIncome ? "Above plan" : "Remaining / excess"}</span>
      </div>
      <ul className="divide-y divide-[var(--warm-100)]">
        {section.rows.map((row) => (
          <VarianceLine key={row.category} row={row} label={labelFor(catalog, row.category)} tone={tone} isIncome={isIncome} />
        ))}
      </ul>
      <div className="border-t border-[var(--warm-200)] bg-[var(--warm-50)]">
        <VarianceLine row={section.totals} label="Total" tone={tone} isIncome={isIncome} bold />
      </div>
    </section>
  );
}

function VarianceLine({
  row,
  label,
  tone,
  isIncome,
  bold,
}: {
  row: CategoryVariance;
  label: string;
  tone: { bar: string };
  isIncome: boolean;
  bold?: boolean;
}) {
  const ratio = row.pctComplete;
  const over = !isIncome && (row.excess ?? 0) > 0;
  const lastCell = isIncome
    ? row.budget == null
      ? "—"
      : row.tracked > row.budget
        ? `+${formatMoney(row.tracked - row.budget)}`
        : formatMoney(0)
    : row.budget == null
      ? "—"
      : over
        ? `−${formatMoney(row.excess ?? 0)}`
        : formatMoney(row.remaining ?? 0);
  return (
    <li className={cn("px-4 py-2", bold && "font-semibold")}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(120px,1.6fr)_repeat(4,minmax(70px,1fr))]">
        <span className="truncate font-body text-sm text-[var(--text-primary)]">{label}</span>
        <span className="text-right font-body text-sm tabular-nums text-[var(--text-primary)] sm:order-none">
          {formatMoney(row.tracked)}
        </span>
        <span className="hidden text-right font-body text-sm tabular-nums text-[var(--text-secondary)] sm:block">
          {row.budget == null ? "—" : formatMoney(row.budget)}
        </span>
        <span
          className={cn(
            "hidden text-right font-body text-sm tabular-nums sm:block",
            ratio == null ? "text-[var(--text-muted)]" : over ? "text-red-700" : "text-[var(--text-secondary)]",
          )}
        >
          {ratio == null ? "—" : `${Math.round(ratio * 100)}%`}
        </span>
        <span
          className={cn(
            "hidden text-right font-body text-sm tabular-nums sm:block",
            over ? "text-red-700" : isIncome && row.budget != null && row.tracked > row.budget ? "text-[var(--emerald-dark)]" : "text-[var(--text-secondary)]",
          )}
        >
          {lastCell}
        </span>
      </div>
      {row.budget != null && row.budget > 0 && (
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--warm-100)]">
            <div
              className={cn("h-full rounded-full", over ? "bg-red-500" : tone.bar)}
              style={{ width: `${Math.min(100, Math.round((ratio ?? 0) * 100))}%` }}
            />
          </div>
          <span className="w-28 text-right font-body text-[11px] tabular-nums text-[var(--text-muted)] sm:hidden">
            {Math.round((ratio ?? 0) * 100)}% of {formatMoney(row.budget)}
          </span>
        </div>
      )}
    </li>
  );
}

function KindDonut({
  section,
  catalog,
  periodLabel,
}: {
  section: VarianceSection;
  catalog: UserCategory[];
  periodLabel: string;
}) {
  const slices = section.rows.filter((row) => row.tracked > 0);
  if (slices.length === 0) return null;
  const palette = section.kind === "income" ? INCOME_PALETTE : section.kind === "savings" ? SAVINGS_PALETTE : null;
  const data = slices.map((row, i) => ({
    name: labelFor(catalog, row.category),
    value: row.tracked,
    color: palette ? palette[i % palette.length] : categoryColor(row.category),
  }));
  const total = slices.reduce((sum, row) => sum + row.tracked, 0);
  return (
    <div className="rounded-lg border border-[var(--warm-200)] bg-white p-5">
      <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
        {CATEGORY_KIND_LABELS[section.kind]} tracked · {periodLabel}
      </h3>
      <p className="mb-3 font-body text-xs text-[var(--text-muted)]">{formatMoney(total)} total</p>
      <div className="flex items-center gap-4">
        <div className="h-[120px] w-[120px] shrink-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={2} dataKey="value" stroke="none">
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="min-w-0 flex-1 space-y-1">
          {data.slice(0, 6).map((entry) => (
            <li key={entry.name} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="flex-1 truncate font-body text-xs text-[var(--text-secondary)]">{entry.name}</span>
              <span className="font-body text-xs font-semibold tabular-nums">{formatMoney(entry.value)}</span>
            </li>
          ))}
          {data.length > 6 && (
            <li className="font-body text-[11px] text-[var(--text-muted)]">+{data.length - 6} more</li>
          )}
        </ul>
      </div>
    </div>
  );
}
