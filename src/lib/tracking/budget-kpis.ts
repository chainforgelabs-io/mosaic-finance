import type { BudgetPlanEntry } from "@/types/tracking";
import { PLAN_KINDS, indexPlan, planAmount, type PlanKind } from "@/lib/tracking/budget-plan";
import {
  cashEffect,
  daysBetween,
  expectedBalance,
  roundMoney,
  transactionKind,
  type CashTxn,
} from "@/lib/tracking/cash-capture";
import { endOfMonth, startOfMonth } from "@/lib/tracking/dates";

export type SavingsRateMode = "active" | "passive";

export interface Period {
  start: string;
  end: string;
  /** Month starts covered by the period, YYYY-MM-01. */
  months: string[];
}

/** A calendar month. */
export function monthPeriod(month: string): Period {
  const start = startOfMonth(month);
  return { start, end: endOfMonth(start), months: [start] };
}

/** A calendar year. */
export function yearPeriod(year: number): Period {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`);
  return { start: months[0], end: endOfMonth(months[11]), months };
}

/**
 * Share of the period that has elapsed, 0 to 1.
 * A past period is complete; a future one has not started.
 */
export function periodCompletion(period: Period, today: string): number {
  if (today >= period.end) return 1;
  if (today < period.start) return 0;
  const total = daysBetween(period.start, period.end) + 1;
  const elapsed = daysBetween(period.start, today) + 1;
  return Math.min(1, Math.max(0, elapsed / total));
}

export interface TrackedTotals {
  income: number;
  expense: number;
  savings: number;
}

function inPeriod(txn: CashTxn, period: Period): boolean {
  return txn.txn_date >= period.start && txn.txn_date <= period.end;
}

/** Logged totals by kind inside the period. Card payments and transfers are left out. */
export function trackedTotals(txns: CashTxn[], period: Period): TrackedTotals {
  const totals = { income: 0, expense: 0, savings: 0 };
  for (const txn of txns) {
    if (!inPeriod(txn, period)) continue;
    const kind = transactionKind(txn);
    if (kind === "neutral") continue;
    totals[kind] += Number(txn.amount) || 0;
  }
  return {
    income: roundMoney(totals.income),
    expense: roundMoney(totals.expense),
    savings: roundMoney(totals.savings),
  };
}

/** Tracked income minus tracked expenses and savings. Negative means spending ran past income. */
export function trackingBalance(totals: TrackedTotals): number {
  return roundMoney(totals.income - totals.expense - totals.savings);
}

/**
 * Savings rate as a share of income.
 * active: what was set aside / income. passive: what was not spent / income.
 * Null when there is no income to compare against.
 */
export function savingsRate(totals: TrackedTotals, mode: SavingsRateMode): number | null {
  if (totals.income <= 0) return null;
  const saved = mode === "active" ? totals.savings : totals.income - totals.expense;
  return Math.round((saved / totals.income) * 1000) / 1000;
}

export interface CategoryVariance {
  kind: PlanKind;
  category: string;
  tracked: number;
  budget: number | null;
  /** tracked / budget, null when there is no budget. */
  pctComplete: number | null;
  /** Budget not yet used. Zero when over. */
  remaining: number | null;
  /** Amount over budget. Zero when under. For income, amount above the plan. */
  excess: number | null;
}

/** Tracked vs budget for one row. */
export function categoryVariance(
  kind: PlanKind,
  category: string,
  tracked: number,
  budget: number | null,
): CategoryVariance {
  const roundedTracked = roundMoney(tracked);
  if (budget == null) {
    return { kind, category, tracked: roundedTracked, budget: null, pctComplete: null, remaining: null, excess: null };
  }
  const diff = roundMoney(budget - roundedTracked);
  return {
    kind,
    category,
    tracked: roundedTracked,
    budget: roundMoney(budget),
    pctComplete: budget > 0 ? Math.round((roundedTracked / budget) * 1000) / 1000 : null,
    remaining: diff > 0 ? diff : 0,
    excess: diff < 0 ? roundMoney(-diff) : 0,
  };
}

/** Planned total for a row across the period's months, or null when nothing is planned. */
function plannedForPeriod(
  index: Map<string, number>,
  kind: PlanKind,
  category: string,
  period: Period,
): number | null {
  let total = 0;
  let any = false;
  for (const month of period.months) {
    const amount = planAmount(index, kind, category, month);
    if (amount == null) continue;
    any = true;
    total += amount;
  }
  return any ? roundMoney(total) : null;
}

export interface VarianceSection {
  kind: PlanKind;
  rows: CategoryVariance[];
  totals: CategoryVariance;
}

/**
 * Tracked vs plan for every category that is planned or logged in the period,
 * grouped by kind. Rows are sorted by tracked amount, planned-but-unused rows last.
 */
export function varianceSections(
  txns: Array<CashTxn & { category: string }>,
  plan: BudgetPlanEntry[],
  period: Period,
  fallbackBudgets: Record<string, number | undefined> = {},
): VarianceSection[] {
  const index = indexPlan(plan);
  const tracked = new Map<string, number>();
  for (const txn of txns) {
    if (!inPeriod(txn, period)) continue;
    const kind = transactionKind(txn);
    if (kind === "neutral") continue;
    const key = `${kind}|${txn.category}`;
    tracked.set(key, (tracked.get(key) ?? 0) + (Number(txn.amount) || 0));
  }

  const sections: VarianceSection[] = [];
  for (const kind of PLAN_KINDS) {
    const categories = new Set<string>();
    for (const entry of plan) {
      if (entry.kind === kind && period.months.includes(startOfMonth(entry.month))) categories.add(entry.category);
    }
    for (const key of tracked.keys()) {
      if (key.startsWith(`${kind}|`)) categories.add(key.slice(kind.length + 1));
    }
    if (kind === "expense") {
      for (const category of Object.keys(fallbackBudgets)) {
        if (fallbackBudgets[category] != null) categories.add(category);
      }
    }

    const rows: CategoryVariance[] = [];
    for (const category of categories) {
      const trackedAmount = tracked.get(`${kind}|${category}`) ?? 0;
      let budget = plannedForPeriod(index, kind, category, period);
      if (budget == null && kind === "expense" && fallbackBudgets[category] != null) {
        budget = roundMoney(Number(fallbackBudgets[category]) * period.months.length);
      }
      if (trackedAmount === 0 && (budget == null || budget === 0)) continue;
      rows.push(categoryVariance(kind, category, trackedAmount, budget));
    }
    rows.sort((a, b) => b.tracked - a.tracked || (b.budget ?? 0) - (a.budget ?? 0) || a.category.localeCompare(b.category));

    const trackedTotal = rows.reduce((sum, row) => sum + row.tracked, 0);
    const budgeted = rows.filter((row) => row.budget != null);
    const budgetTotal = budgeted.length > 0 ? budgeted.reduce((sum, row) => sum + (row.budget ?? 0), 0) : null;
    sections.push({
      kind,
      rows,
      totals: categoryVariance(kind, "total", trackedTotal, budgetTotal),
    });
  }
  return sections;
}

export interface MonthPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
  plannedIncome: number | null;
  plannedExpense: number | null;
  plannedSavings: number | null;
}

/** Twelve points for a year: tracked totals and planned totals by kind. */
export function monthlySeries(
  txns: CashTxn[],
  plan: BudgetPlanEntry[],
  year: number,
): MonthPoint[] {
  const { months } = yearPeriod(year);
  const planned = new Map<string, { income: number; expense: number; savings: number; any: boolean }>();
  for (const entry of plan) {
    const month = startOfMonth(entry.month);
    if (!months.includes(month)) continue;
    const row = planned.get(month) ?? { income: 0, expense: 0, savings: 0, any: false };
    row[entry.kind] += Number(entry.amount) || 0;
    row.any = true;
    planned.set(month, row);
  }
  return months.map((month) => {
    const totals = trackedTotals(txns, monthPeriod(month));
    const row = planned.get(month);
    return {
      month,
      label: new Date(`${month}T00:00:00`).toLocaleDateString("en-CA", { month: "short" }),
      ...totals,
      plannedIncome: row?.any ? roundMoney(row.income) : null,
      plannedExpense: row?.any ? roundMoney(row.expense) : null,
      plannedSavings: row?.any ? roundMoney(row.savings) : null,
    };
  });
}

export interface LedgerRow<T extends CashTxn = CashTxn> {
  txn: T;
  kind: ReturnType<typeof transactionKind>;
  /** Signed cash movement for this line. */
  effect: number;
  /** Running sum of effects from the oldest line to this one. */
  balance: number;
}

/**
 * Cash on hand at the start of `year`.
 * Prefers the cash anchor rolled forward through Dec 31 of the prior year;
 * otherwise the running cash effect of every line dated before Jan 1.
 */
export function ledgerOpening(
  year: number,
  priorTxns: CashTxn[],
  anchor?: { starting_balance: number; anchor_date: string } | null,
): number {
  const lastPrior = `${year - 1}-12-31`;
  const beforeYear = priorTxns.filter((txn) => txn.txn_date <= lastPrior);
  if (anchor && anchor.anchor_date <= lastPrior) {
    return expectedBalance(anchor.starting_balance, anchor.anchor_date, beforeYear, lastPrior);
  }
  return roundMoney(beforeYear.reduce((sum, txn) => sum + cashEffect(txn), 0));
}

/**
 * Lines oldest-first with a running balance, so a user can scan the period like a statement.
 * The balance starts at `opening`, which defaults to zero.
 */
export function ledgerRows<T extends CashTxn>(txns: T[], opening = 0): LedgerRow<T>[] {
  const ordered = [...txns].sort((a, b) => (a.txn_date < b.txn_date ? -1 : a.txn_date > b.txn_date ? 1 : 0));
  let balance = opening;
  return ordered.map((txn) => {
    const effect = cashEffect(txn);
    balance = roundMoney(balance + effect);
    return { txn, kind: transactionKind(txn), effect: roundMoney(effect), balance };
  });
}

export interface LedgerHeaderKpis {
  today: string;
  lastRecord: string | null;
  daysSinceLastRecord: number | null;
  recordsThisYear: number;
  /** Income minus expenses and savings for the calendar year to date. */
  trackingBalanceYtd: number;
}

export function ledgerHeaderKpis(txns: CashTxn[], today: string): LedgerHeaderKpis {
  const year = Number(today.slice(0, 4));
  const period = yearPeriod(year);
  let lastRecord: string | null = null;
  let recordsThisYear = 0;
  for (const txn of txns) {
    if (!lastRecord || txn.txn_date > lastRecord) lastRecord = txn.txn_date;
    if (inPeriod(txn, period)) recordsThisYear += 1;
  }
  return {
    today,
    lastRecord,
    daysSinceLastRecord: lastRecord ? daysBetween(lastRecord, today) : null,
    recordsThisYear,
    trackingBalanceYtd: trackingBalance(trackedTotals(txns, { ...period, end: today < period.end ? today : period.end })),
  };
}
