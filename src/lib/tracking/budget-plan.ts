import type { BudgetPlanEntry, BudgetPlanSchedule } from "@/types/tracking";
import { categoryKind, categorySlug, type CategoryKind } from "@/lib/tracking/categories";
import {
  advanceRecurringDate,
  isNeedCategory,
  perOccurrenceAmount,
  retreatRecurringDate,
  roundMoney,
  transactionKind,
  type AmountBasis,
  type CashTxn,
  type RecurringCadence,
} from "@/lib/tracking/cash-capture";
import { cardPaymentIsCovered, type StatementLine } from "@/lib/tracking/statement-baseline";
import { monthKey, startOfMonth } from "@/lib/tracking/dates";
import { formatMoneyExact } from "@/lib/tracking/format";

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
 * Month totals for one repeating payment.
 * Counts how many payment dates fall in each month of `year`, using `anchorDate`
 * as a real payment date (the last one the person knows). A biweekly mortgage
 * lands 2 times in some months and 3 in others.
 */
export function scheduledMonthAmounts(
  perPayment: number,
  cadence: RecurringCadence,
  anchorDate: string,
  year: number,
): { month: string; amount: number; count: number }[] {
  const months = monthsOfYear(year);
  const empty = months.map((month) => ({ month, amount: 0, count: 0 }));
  if (!Number.isFinite(perPayment) || perPayment <= 0) return empty;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) return empty;

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  let cursor = anchorDate;

  for (let i = 0; i < 500 && cursor >= start; i++) {
    const prev = retreatRecurringDate(cursor, cadence);
    if (prev >= cursor) return empty;
    cursor = prev;
  }
  if (cursor < start) {
    for (let i = 0; i < 500 && cursor < start; i++) {
      const next = advanceRecurringDate(cursor, cadence);
      if (next <= cursor) return empty;
      cursor = next;
    }
  }

  const counts = new Map<string, number>();
  for (let i = 0; i < 500 && cursor <= end; i++) {
    if (cursor >= start && cursor.slice(0, 4) === String(year)) {
      const month = `${cursor.slice(0, 7)}-01`;
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    const next = advanceRecurringDate(cursor, cadence);
    if (next <= cursor) break;
    cursor = next;
  }

  return months.map((month) => {
    const count = counts.get(month) ?? 0;
    return { month, count, amount: roundMoney(count * perPayment) };
  });
}

/** Every repeating cadence needs a last payment date. A flat envelope (null cadence) does not. */
export function needsAnchorDate(cadence: RecurringCadence | null): boolean {
  return cadence != null;
}

/**
 * Twelve month totals for one row.
 * A variable envelope, or a monthly row saved before dates were stored, is the same
 * amount every month. Other cadences, including monthly with a date, count how many
 * payments land in each month from the last payment date.
 */
export function monthAmountsFromRow(
  amount: number,
  cadence: RecurringCadence | null,
  basis: AmountBasis,
  anchorDate: string | null,
  year: number,
): { month: string; amount: number; count: number }[] {
  const months = monthsOfYear(year);
  const empty = months.map((month) => ({ month, amount: 0, count: 0 }));
  if (!Number.isFinite(amount) || amount <= 0) return empty;

  if (cadence == null || (cadence === "monthly" && !anchorDate)) {
    const monthly = basis === "year" ? roundMoney(amount / 12) : roundMoney(amount);
    return months.map((month) => ({ month, amount: monthly, count: 1 }));
  }

  const each = perOccurrenceAmount(amount, cadence, basis);
  if (each <= 0) return empty;
  return scheduledMonthAmounts(each, cadence, anchorDate ?? "", year);
}

function longMonth(month: string): string {
  return new Date(`${month.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-CA", {
    month: "long",
    timeZone: "UTC",
  });
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * One sentence for the setup preview.
 * A payment that misses January names the months it lands in, instead of reading January as the monthly amount.
 */
export function paymentPreviewNote(
  slots: { month: string; amount: number; count: number }[],
): string | null {
  const paid = slots.filter((slot) => slot.count > 0 && slot.amount > 0);
  if (paid.length === 0) return null;
  const three = paid.find((slot) => slot.count === 3);
  const two = paid.find((slot) => slot.count === 2);
  if (three && two) {
    return `${longMonth(three.month)} has 3 payments (${formatMoneyExact(three.amount)}). ${longMonth(two.month)} has 2 (${formatMoneyExact(two.amount)}).`;
  }
  if (paid.length < slots.length) {
    const amount = paid[0].amount;
    const same = paid.every((slot) => slot.amount === amount);
    if (paid.length === 1 && same) {
      return `${longMonth(paid[0].month)} has 1 payment (${formatMoneyExact(amount)}).`;
    }
    if (same) {
      return `Payments land in ${joinNames(paid.map((slot) => longMonth(slot.month)))} (${formatMoneyExact(amount)} each).`;
    }
    return `${paid.map((slot) => `${longMonth(slot.month)} ${formatMoneyExact(slot.amount)}`).join(". ")}.`;
  }
  return `About ${formatMoneyExact(paid[0].amount)} a month.`;
}

/** Fill one calendar year from saved payment schedules, using each row's own dates. */
export function entriesFromSchedules(schedules: BudgetPlanSchedule[], year: number): BudgetPlanEntry[] {
  const entries: BudgetPlanEntry[] = [];
  for (const row of schedules) {
    if (!(row.amount > 0)) continue;
    const slots = monthAmountsFromRow(row.amount, row.cadence, row.basis, row.anchor_date, year);
    for (const slot of slots) {
      entries.push({ kind: row.kind, category: row.category, month: slot.month, amount: slot.amount });
    }
  }
  return entries;
}

/** Walk from a last payment to the next date on or after today. */
export function nextDateFromAnchor(anchorDate: string, cadence: RecurringCadence, today: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) return today;
  let cursor = anchorDate;
  if (cursor >= today) return cursor;
  for (let i = 0; i < 500 && cursor < today; i++) {
    const next = advanceRecurringDate(cursor, cadence);
    if (next <= cursor) return today;
    cursor = next;
  }
  return cursor;
}

/**
 * The budget that applies to an expense category in a month.
 * A plan amount above zero wins. A blank plan cell is stored as zero and is not a budget,
 * so the standing monthly limit applies. A zero standing limit is also unset.
 */
export function effectiveBudget(
  index: Map<string, number>,
  defaults: Record<string, number | undefined>,
  category: string,
  month: string,
): number | null {
  const planned = planAmount(index, "expense", category, month);
  if (planned != null && planned > 0) return planned;
  const fallback = defaults[category];
  if (fallback == null || !(Number(fallback) > 0)) return null;
  return Number(fallback);
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

export interface LedgerPlanRow {
  kind: PlanKind;
  name: string;
  amount: number;
  /** Null cadence is a flat monthly envelope. */
  cadence: RecurringCadence | null;
  basis: AmountBasis;
  nextDate: string | null;
}

export interface LedgerSchedule {
  name: string;
  amount: number;
  category: string;
  direction: "in" | "out";
  cadence: RecurringCadence;
  next_date: string;
  line_role: "income" | "purchase" | "savings";
}

function uniqueSlug(label: string, used: Set<string>): string | null {
  const base = categorySlug(label);
  if (!base) return null;
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  for (let n = 2; n < 20; n++) {
    const suffix = `_${n}`;
    const next = `${base.slice(0, 40 - suffix.length)}${suffix}`;
    if (!used.has(next)) {
      used.add(next);
      return next;
    }
  }
  return null;
}

/**
 * Turn named rows into a full-year plan, the saved row inputs, and one repeating
 * payment for each scheduled cadence. A biweekly mortgage is 2× in some months and 3× in others.
 */
export function ledgerFromRows(
  rows: LedgerPlanRow[],
  year: number,
  today: string = `${year}-01-01`,
): {
  entries: BudgetPlanEntry[];
  categories: { slug: string; label: string; kind: PlanKind }[];
  schedules: LedgerSchedule[];
  planSchedules: BudgetPlanSchedule[];
} {
  const used = new Set<string>();
  const entries: BudgetPlanEntry[] = [];
  const categories: { slug: string; label: string; kind: PlanKind }[] = [];
  const schedules: LedgerSchedule[] = [];
  const planSchedules: BudgetPlanSchedule[] = [];

  for (const row of rows) {
    const name = row.name.trim();
    if (!name || !(row.amount > 0)) continue;
    const slug = uniqueSlug(name, used);
    if (!slug) continue;
    if (needsAnchorDate(row.cadence) && !row.nextDate) continue;
    const slots = monthAmountsFromRow(row.amount, row.cadence, row.basis, row.nextDate, year);
    if (slots.every((slot) => slot.amount <= 0)) continue;
    categories.push({ slug, label: name, kind: row.kind });
    for (const slot of slots) {
      entries.push({ kind: row.kind, category: slug, month: slot.month, amount: slot.amount });
    }
    planSchedules.push({
      kind: row.kind,
      category: slug,
      amount: row.amount,
      basis: row.basis,
      cadence: row.cadence,
      anchor_date: needsAnchorDate(row.cadence) ? row.nextDate : null,
    });
    if (row.cadence) {
      const each = perOccurrenceAmount(row.amount, row.cadence, row.basis);
      if (each <= 0) continue;
      const next =
        row.nextDate && /^\d{4}-\d{2}-\d{2}$/.test(row.nextDate)
          ? nextDateFromAnchor(row.nextDate, row.cadence, today)
          : today;
      schedules.push({
        name,
        amount: each,
        category: slug,
        direction: row.kind === "income" ? "in" : "out",
        cadence: row.cadence,
        next_date: next,
        line_role: row.kind === "income" ? "income" : row.kind === "savings" ? "savings" : "purchase",
      });
    }
  }

  return { entries, categories, schedules, planSchedules };
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
