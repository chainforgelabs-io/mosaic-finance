import { addDays } from "@/lib/tracking/dates";
import { resolvedLineRole } from "@/lib/tracking/spending-parse";

export type CashDirection = "in" | "out";
export type RecurringCadence = "weekly" | "biweekly" | "monthly";

export interface CashTxn {
  txn_date: string;
  amount: number;
  direction?: string | null;
  line_role?: string | null;
  description?: string | null;
  instrument?: string | null;
  category?: string | null;
  source?: string | null;
}

const SPEND_ROLES = new Set(["purchase", "fee", "interest"]);

/** Needs are the bills and basics a statement average treats as already committed. */
export const NEED_CATEGORIES = new Set([
  "housing",
  "utilities",
  "insurance",
  "groceries",
  "transportation",
  "health",
  "debt_payments",
  "condo_fees",
]);

export function isNeedCategory(category: string | null | undefined): boolean {
  return NEED_CATEGORIES.has(category ?? "");
}

export function countsTowardSpend(txn: {
  direction?: string | null;
  line_role?: string | null;
  description?: string | null;
}): boolean {
  const role = resolvedLineRole(txn);
  return SPEND_ROLES.has(role);
}

/** Money set aside. Leaves the bank like a purchase but is never spending. */
export function isSavings(txn: { line_role?: string | null }): boolean {
  return txn.line_role === "savings";
}

export type TransactionKind = "income" | "expense" | "savings" | "neutral";

/** Which plan section a logged line belongs to. Card payments and transfers are neutral. */
export function transactionKind(txn: {
  direction?: string | null;
  line_role?: string | null;
  description?: string | null;
}): TransactionKind {
  if (isSavings(txn)) return "savings";
  const role = resolvedLineRole(txn);
  if (role === "card_payment" || role === "transfer") return "neutral";
  if (role === "income") return "income";
  if (SPEND_ROLES.has(role)) return "expense";
  return isOutflow(txn.direction) ? "expense" : "income";
}

/** How a line moves the bank balance. Card purchases do not. Card payments do. */
export function cashEffect(txn: CashTxn): number {
  const amount = Number(txn.amount);
  if (!Number.isFinite(amount)) return 0;
  const role = resolvedLineRole(txn);
  if (role === "transfer") return 0;
  if (role === "card_payment") return -Math.abs(amount);
  // Card purchases and card credits change the card balance, not the bank.
  if (txn.instrument === "credit") return 0;
  if (role === "income") return Math.abs(amount);
  return isOutflow(txn.direction) ? -Math.abs(amount) : Math.abs(amount);
}

export interface RecurringOccurrence {
  id: string;
  amount: number;
  direction: CashDirection | string;
  next_date: string;
  cadence: RecurringCadence;
  active: boolean;
}

const SPEND_DEFAULTS = ["dining", "groceries", "transportation", "shopping"];
const INCOME_DEFAULTS = ["paycheque", "income"];

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Digits are cents. "640" is $6.40. There is no decimal key. */
export function amountFromDigits(digits: string): number {
  const clean = digits.replace(/\D/g, "").slice(0, 9);
  if (!clean) return 0;
  return Number(clean) / 100;
}

export function formatAmountInput(digits: string): string {
  const cents = Math.round(amountFromDigits(digits) * 100);
  const dollars = Math.floor(cents / 100);
  const rem = cents % 100;
  return `${dollars.toLocaleString("en-CA")}.${String(rem).padStart(2, "0")}`;
}

export function isOutflow(direction: string | null | undefined): boolean {
  return (direction ?? "out") !== "in";
}

export function outflowTotal(txns: CashTxn[]): number {
  return roundMoney(
    txns.reduce((sum, txn) => sum + (countsTowardSpend(txn) ? Number(txn.amount) || 0 : 0), 0),
  );
}

export function advanceRecurringDate(isoDate: string, cadence: RecurringCadence): string {
  if (cadence === "weekly") return addDays(isoDate, 7);
  if (cadence === "biweekly") return addDays(isoDate, 14);
  const [year, month, day] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + 1, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const clamped = Math.min(day, last);
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), clamped)).toISOString().slice(0, 10);
}

export function occurrencesInRange(
  nextDate: string,
  cadence: RecurringCadence,
  start: string,
  end: string,
): string[] {
  const dates: string[] = [];
  let cursor = nextDate;
  for (let i = 0; i < 24 && cursor <= end; i++) {
    if (cursor >= start) dates.push(cursor);
    cursor = advanceRecurringDate(cursor, cadence);
  }
  return dates;
}

/**
 * Starting balance is the cash on hand at the end of anchorDate.
 * Transactions after that date, through asOf, move the expected balance.
 */
export function expectedBalance(
  startingBalance: number,
  anchorDate: string,
  txns: CashTxn[],
  asOf: string,
): number {
  let balance = startingBalance;
  for (const txn of txns) {
    if (txn.txn_date <= anchorDate || txn.txn_date > asOf) continue;
    balance += cashEffect(txn);
  }
  return roundMoney(balance);
}

export function balanceGap(actual: number, expected: number): number {
  return roundMoney(actual - expected);
}

export function gapBooking(
  actual: number,
  expected: number,
): { direction: CashDirection; amount: number } | null {
  const gap = balanceGap(actual, expected);
  if (Math.abs(gap) < 0.005) return null;
  if (gap < 0) return { direction: "out", amount: roundMoney(-gap) };
  return { direction: "in", amount: gap };
}

export function daysBetween(earlier: string, later: string): number {
  const [y1, m1, d1] = earlier.split("-").map(Number);
  const [y2, m2, d2] = later.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

export function latestDate(dates: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  for (const date of dates) {
    if (!date) continue;
    if (!best || date > best) best = date;
  }
  return best;
}

function timeBucket(hour: number): string {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "midday";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

export function predictCategories(
  history: Array<CashTxn & { category: string; created_at?: string | null }>,
  now: Date,
  amount: number | null,
  direction: CashDirection,
  limit = 4,
): string[] {
  const weekday = now.getDay();
  const bucket = timeBucket(now.getHours());
  const scores = new Map<string, number>();

  for (const txn of history) {
    if ((direction === "in" ? isOutflow(txn.direction) : !isOutflow(txn.direction))) continue;
    if (!txn.category || txn.category === "untracked") continue;
    let score = 1;
    const created = txn.created_at ? new Date(txn.created_at) : null;
    if (created && !Number.isNaN(created.getTime())) {
      if (created.getDay() === weekday) score += 3;
      if (timeBucket(created.getHours()) === bucket) score += 3;
    } else {
      const [year, month, day] = txn.txn_date.split("-").map(Number);
      const dated = new Date(year, month - 1, day);
      if (dated.getDay() === weekday) score += 2;
    }
    if (amount != null && amount > 0 && Number(txn.amount) > 0) {
      const ratio = amount / Number(txn.amount);
      if (ratio >= 0.75 && ratio <= 1.25) score += 4;
    }
    scores.set(txn.category, (scores.get(txn.category) ?? 0) + score);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([category]) => category);
  const defaults = direction === "in" ? INCOME_DEFAULTS : SPEND_DEFAULTS;
  const merged = [...ranked];
  for (const category of defaults) {
    if (!merged.includes(category)) merged.push(category);
  }
  return merged.slice(0, limit);
}

const SAVINGS_DEFAULTS = ["tfsa", "rrsp", "cash_savings", "emergency_fund"];

/** Savings chips: the accounts used most, then common defaults. */
export function predictSavingsCategories(
  history: Array<CashTxn & { category: string }>,
  limit = 4,
): string[] {
  const counts = new Map<string, number>();
  for (const txn of history) {
    if (!isSavings(txn) || !txn.category) continue;
    counts.set(txn.category, (counts.get(txn.category) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);
  for (const category of SAVINGS_DEFAULTS) {
    if (!ranked.includes(category)) ranked.push(category);
  }
  return ranked.slice(0, limit);
}

export function periodRoom(monthlyRoom: number, period: "week" | "month"): number {
  if (period === "month") return roundMoney(monthlyRoom);
  return roundMoney((monthlyRoom * 12) / 52);
}

export interface LeftToSpendInput {
  periodStart: string;
  periodEnd: string;
  txns: CashTxn[];
  recurring: RecurringOccurrence[];
  monthlyRoom: number | null;
  period: "week" | "month";
  statementBaseline?: { incomeMonthly: number; needsMonthly: number } | null;
}

export interface LeftToSpend {
  left: number | null;
  spent: number;
  commitments: number;
  income: number;
  /** Money set aside this period. Reduces what is left without counting as spending. */
  savings: number;
  usesBudget: boolean;
  usesStatement: boolean;
}

export function leftToSpend(input: LeftToSpendInput): LeftToSpend {
  if (input.statementBaseline) {
    const room = input.statementBaseline.incomeMonthly - input.statementBaseline.needsMonthly;
    let logged = 0;
    let savings = 0;
    for (const txn of input.txns) {
      if (txn.txn_date < input.periodStart || txn.txn_date > input.periodEnd) continue;
      if (txn.source === "screenshot") continue;
      if (isSavings(txn)) {
        savings += Number(txn.amount) || 0;
        continue;
      }
      if (!countsTowardSpend(txn)) continue;
      if (isNeedCategory(txn.category)) continue;
      logged += Number(txn.amount) || 0;
    }
    return {
      left: roundMoney(periodRoom(room, input.period) - logged - savings),
      spent: roundMoney(logged),
      commitments: periodRoom(input.statementBaseline.needsMonthly, input.period),
      income: periodRoom(input.statementBaseline.incomeMonthly, input.period),
      savings: roundMoney(savings),
      usesBudget: false,
      usesStatement: true,
    };
  }

  let incomePosted = 0;
  let spent = 0;
  let savings = 0;
  for (const txn of input.txns) {
    if (txn.txn_date < input.periodStart || txn.txn_date > input.periodEnd) continue;
    const amount = Number(txn.amount) || 0;
    if (txn.line_role === "card_payment" || txn.line_role === "transfer") continue;
    if (isSavings(txn)) {
      savings += amount;
      continue;
    }
    if (countsTowardSpend(txn)) spent += amount;
    else incomePosted += amount;
  }

  let incomeDue = 0;
  let commitments = 0;
  for (const item of input.recurring) {
    if (!item.active) continue;
    const count = occurrencesInRange(item.next_date, item.cadence, input.periodStart, input.periodEnd).length;
    const total = count * Number(item.amount);
    if (item.direction === "in") incomeDue += total;
    else commitments += total;
  }

  const income = roundMoney(incomePosted + incomeDue);
  spent = roundMoney(spent);
  commitments = roundMoney(commitments);
  savings = roundMoney(savings);

  if (income > 0) {
    return {
      left: roundMoney(income - commitments - spent - savings),
      spent,
      commitments,
      income,
      savings,
      usesBudget: false,
      usesStatement: false,
    };
  }

  if (input.monthlyRoom != null && input.monthlyRoom > 0) {
    return {
      left: roundMoney(periodRoom(input.monthlyRoom, input.period) - commitments - spent - savings),
      spent,
      commitments,
      income,
      savings,
      usesBudget: true,
      usesStatement: false,
    };
  }

  return { left: null, spent, commitments, income, savings, usesBudget: false, usesStatement: false };
}

export function splitLines(
  total: number,
  firstCategory: string,
  secondAmount: number,
  secondCategory: string,
): { amount: number; category: string }[] | null {
  const second = roundMoney(secondAmount);
  const first = roundMoney(total - second);
  if (first <= 0 || second <= 0) return null;
  if (!firstCategory || !secondCategory) return null;
  return [
    { amount: first, category: firstCategory },
    { amount: second, category: secondCategory },
  ];
}
