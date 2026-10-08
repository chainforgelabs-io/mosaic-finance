import type { BudgetPlanEntry } from "@/types/tracking";
import type { CategoryKind } from "@/lib/tracking/categories";
import { categoryKind } from "@/lib/tracking/categories";
import {
  isNeedCategory,
  roundMoney,
  transactionKind,
  type CashTxn,
} from "@/lib/tracking/cash-capture";
import { cardPaymentIsCovered, type StatementLine } from "@/lib/tracking/statement-baseline";
import { monthKey, startOfMonth } from "@/lib/tracking/dates";

export type PlanKind = CategoryKind;

export const PLAN_KINDS: PlanKind[] = ["income", "expense", "savings"];

/** The twelve month starts of a calendar year, YYYY-MM-01. */
export function monthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}-01`);
}

export function planKey(kind: PlanKind, category: string, month: string): string {
  return `${kind}|${category}|${startOfMonth(month)}`;
}

/** Entries indexed by kind|category|month for O(1) lookups. */
export function indexPlan(entries: BudgetPlanEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(planKey(entry.kind, entry.category, entry.month), Number(entry.amount) || 0);
  }
  return map;
}

export function planAmount(
  index: Map<string, number>,
  kind: PlanKind,
  category: string,
  month: string,
): number | null {
  const value = index.get(planKey(kind, category, month));
  return value == null ? null : value;
}

export interface PlanTotals {
  income: number;
  expense: number;
  savings: number;
  /** Income minus expenses and savings. Negative means the plan spends more than it brings in. */
  toBeAllocated: number;
}

/** Totals for one month, or for a whole year when `month` is omitted. */
export function planTotals(entries: BudgetPlanEntry[], month?: string): PlanTotals {
  const target = month ? startOfMonth(month) : null;
  const totals = { income: 0, expense: 0, savings: 0 };
  for (const entry of entries) {
    if (target && startOfMonth(entry.month) !== target) continue;
    totals[entry.kind] += Number(entry.amount) || 0;
  }
  return {
    income: roundMoney(totals.income),
    expense: roundMoney(totals.expense),
    savings: roundMoney(totals.savings),
    toBeAllocated: roundMoney(totals.income - totals.expense - totals.savings),
  };
}

/** Sum of one row across the given months. */
export function rowTotal(
  index: Map<string, number>,
  kind: PlanKind,
  category: string,
  months: string[],
): number {
  return roundMoney(months.reduce((sum, month) => sum + (planAmount(index, kind, category, month) ?? 0), 0));
}

/** Categories that appear in the plan for a kind, in first-seen order. */
export function plannedCategories(entries: BudgetPlanEntry[], kind: PlanKind): string[] {
  const seen: string[] = [];
  for (const entry of entries) {
    if (entry.kind !== kind || seen.includes(entry.category)) continue;
    seen.push(entry.category);
  }
  return seen;
}

/**
 * Copy one month's value into the months that follow it in the same year.
 * Returns the full set of entries for that row so the caller can upsert them.
 */
export function fillAcrossMonths(
  kind: PlanKind,
  category: string,
  fromMonth: string,
  amount: number,
  months: string[],
): BudgetPlanEntry[] {
  const start = startOfMonth(fromMonth);
  return months
    .filter((month) => month >= start)
    .map((month) => ({ kind, category, month, amount: roundMoney(amount) }));
}

/**
 * The budget that applies to an expense category in a month.
 * A plan entry wins; otherwise the standing monthly limit from category_budgets.
 */
export function effectiveBudget(
  index: Map<string, number>,
  defaults: Record<string, number | undefined>,
  category: string,
  month: string,
): number | null {
  const planned = planAmount(index, "expense", category, month);
  if (planned != null) return planned;
  const fallback = defaults[category];
  return fallback == null ? null : Number(fallback);
}

export interface PlanSuggestion {
  kind: PlanKind;
  category: string;
  monthly: number;
  isNeed: boolean;
}

function kindForLine(line: StatementLine): PlanKind | null {
  const role = line.line_role ?? "purchase";
  if (role === "transfer") return null;
  if (role === "savings") return "savings";
  if (role === "income") return line.instrument === "credit" ? null : "income";
  if (role === "card_payment") return null;
  return "expense";
}

/**
 * Monthly averages per category from parsed statement lines.
 * Averages over the months present, so a three-month upload gives a three-month average.
 * A bank payment to a card counts only when that card's statement is not in the set.
 */
export function planFromStatementLines(lines: StatementLine[], today: string): PlanSuggestion[] {
  const dated = lines.filter((line) => line.txn_date && Number(line.amount) > 0);
  if (dated.length === 0) return [];

  const current = monthKey(today);
  const monthsPresent = [...new Set(dated.map((line) => monthKey(line.txn_date as string)))].sort();
  const earlier = monthsPresent.filter((month) => month < current);
  const months = earlier.length > 0 ? earlier : monthsPresent;
  const divisor = Math.max(months.length, 1);

  const totals = new Map<string, { kind: PlanKind; amount: number }>();
  function add(kind: PlanKind, category: string, amount: number) {
    const key = `${kind}|${category}`;
    const row = totals.get(key) ?? { kind, amount: 0 };
    row.amount += amount;
    totals.set(key, row);
  }

  for (const line of dated) {
    const month = monthKey(line.txn_date as string);
    if (!months.includes(month)) continue;
    const amount = Number(line.amount) || 0;
    const role = line.line_role ?? "purchase";

    if (role === "card_payment") {
      if (line.instrument !== "credit" && !cardPaymentIsCovered(line, dated)) {
        add("expense", line.suggested_category || "debt_payments", amount);
      }
      continue;
    }
    if (role === "income" && line.instrument === "credit") {
      // A card credit or refund offsets spending in that category.
      add("expense", line.suggested_category || "other", -amount);
      continue;
    }
    const kind = kindForLine(line);
    if (!kind) continue;
    const category =
      line.suggested_category || (kind === "income" ? "paycheque" : kind === "savings" ? "other_savings" : "other");
    add(kind, category, amount);
  }

  return [...totals.entries()]
    .map(([key, row]) => {
      const category = key.slice(key.indexOf("|") + 1);
      return {
        kind: row.kind,
        category,
        monthly: roundMoney(row.amount / divisor),
        isNeed: row.kind === "expense" && isNeedCategory(category),
      };
    })
    .filter((row) => row.monthly > 0)
    .sort((a, b) => PLAN_KINDS.indexOf(a.kind) - PLAN_KINDS.indexOf(b.kind) || b.monthly - a.monthly);
}

/**
 * Monthly averages per category from logged transactions over recent full months.
 * Catch-up lines stay as "untracked" so the user can see what was not sorted.
 */
export function planFromHistory(
  txns: Array<CashTxn & { category: string }>,
  today: string,
  monthsBack = 3,
): PlanSuggestion[] {
  const current = monthKey(today);
  const months = new Set<string>();
  for (const txn of txns) {
    const month = monthKey(txn.txn_date);
    if (month < current) months.add(month);
  }
  const recent = [...months].sort().slice(-monthsBack);
  if (recent.length === 0) return [];

  const totals = new Map<string, { kind: PlanKind; amount: number }>();
  for (const txn of txns) {
    const month = monthKey(txn.txn_date);
    if (!recent.includes(month)) continue;
    const kind = transactionKind(txn);
    if (kind === "neutral") continue;
    const key = `${kind}|${txn.category}`;
    const row = totals.get(key) ?? { kind, amount: 0 };
    row.amount += Number(txn.amount) || 0;
    totals.set(key, row);
  }

  return [...totals.entries()]
    .map(([key, row]) => {
      const category = key.slice(key.indexOf("|") + 1);
      return {
        kind: row.kind,
        category,
        monthly: roundMoney(row.amount / recent.length),
        isNeed: row.kind === "expense" && isNeedCategory(category),
      };
    })
    .filter((row) => row.monthly > 0)
    .sort((a, b) => PLAN_KINDS.indexOf(a.kind) - PLAN_KINDS.indexOf(b.kind) || b.monthly - a.monthly);
}

/** Expand suggestions into one entry per month of the year. */
export function entriesFromSuggestions(suggestions: PlanSuggestion[], year: number): BudgetPlanEntry[] {
  const months = monthsOfYear(year);
  const entries: BudgetPlanEntry[] = [];
  for (const suggestion of suggestions) {
    for (const month of months) {
      entries.push({
        kind: suggestion.kind,
        category: suggestion.category,
        month,
        amount: suggestion.monthly,
      });
    }
  }
  return entries;
}

/** Starter rows with no amounts, so a new user sees the shape of a plan. */
export function presetSuggestions(): PlanSuggestion[] {
  const rows: Array<[PlanKind, string]> = [
    ["income", "paycheque"],
    ["expense", "housing"],
    ["expense", "utilities"],
    ["expense", "groceries"],
    ["expense", "transportation"],
    ["expense", "insurance"],
    ["expense", "subscriptions"],
    ["expense", "dining"],
    ["expense", "shopping"],
    ["expense", "entertainment"],
    ["expense", "debt_payments"],
    ["expense", "other"],
    ["savings", "tfsa"],
    ["savings", "rrsp"],
    ["savings", "cash_savings"],
  ];
  return rows.map(([kind, category]) => ({
    kind,
    category,
    monthly: 0,
    isNeed: kind === "expense" && isNeedCategory(category),
  }));
}

/** Guard for API input and localStorage migration. */
export function isPlanKind(value: unknown): value is PlanKind {
  return value === "income" || value === "expense" || value === "savings";
}

/** Kind for a category when the plan has no say: income and savings built-ins, else expense. */
export function kindForCategory(category: string): PlanKind {
  return categoryKind(category);
}
