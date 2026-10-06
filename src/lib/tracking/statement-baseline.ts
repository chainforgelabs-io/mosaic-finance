import type { StatementInstrument, StatementLineRole } from "@/types/tracking";
import { categoryLabel } from "@/lib/tracking/categories";
import {
  advanceRecurringDate,
  countsTowardSpend,
  isNeedCategory,
  roundMoney,
  type RecurringCadence,
} from "@/lib/tracking/cash-capture";
import { monthKey } from "@/lib/tracking/dates";

export type { StatementInstrument, StatementLineRole };

export interface StatementLine {
  txn_date: string | null;
  amount: number;
  description: string;
  suggested_category: string;
  instrument?: StatementInstrument | null;
  line_role?: StatementLineRole | string | null;
}

export interface RepeatSuggestion {
  name: string;
  amount: number;
  category: string;
  direction: "in" | "out";
  cadence: RecurringCadence;
  nextDate: string;
}

export interface StatementBaseline {
  months: string[];
  monthLabels: string;
  partial: boolean;
  incomeMonthly: number;
  needsMonthly: number;
  flexibleMonthly: number;
  leftMonthly: number;
  creditGrowthMonthly: number;
  flexibleByCategory: { category: string; monthly: number }[];
  hasCredit: boolean;
  hasDebit: boolean;
  repeats: RepeatSuggestion[];
  observation: string | null;
}

const STOP_WORDS = new Set([
  "pos",
  "visa",
  "debit",
  "credit",
  "mastercard",
  "interac",
  "purchase",
  "payment",
  "withdrawal",
  "the",
  "and",
]);

function money(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function monthName(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-CA", {
    month: "long",
    timeZone: "UTC",
  });
}

function joinLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function baselineObservation(input: {
  leftMonthly: number;
  flexibleMonthly: number;
  flexibleByCategory: { category: string; monthly: number }[];
  creditGrowthMonthly: number;
}): string | null {
  const ahead = input.leftMonthly < -0.5;
  const grew = input.creditGrowthMonthly > 0.5;
  if (!ahead && !grew) return null;

  const leaders = input.flexibleByCategory
    .filter((row) => row.monthly > 0)
    .slice(0, 3)
    .map((row) => categoryLabel(row.category));
  const parts: string[] = [];
  if (ahead) {
    const gap = money(input.leftMonthly);
    parts.push(
      leaders.length > 0
        ? `Spending ran about ${gap} a month ahead of money in. Flexible spending averaged ${money(input.flexibleMonthly)} a month, led by ${joinLabels(leaders)}.`
        : `Spending ran about ${gap} a month ahead of money in.`,
    );
  }
  if (grew) {
    const growth = money(input.creditGrowthMonthly);
    parts.push(
      ahead
        ? `The credit card balance grew by about ${growth} a month. That spending had not come out of the bank yet.`
        : `Money in covered what cleared the bank. The credit card balance still grew by about ${growth} a month, which had not come out of the bank yet.`,
    );
  }
  return parts.join(" ");
}

function merchantKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 3)
    .join(" ");
}

function nextMonthlyDate(last: string, today: string): string {
  if (last >= today) return last;
  let cursor = advanceRecurringDate(last, "monthly");
  for (let i = 0; i < 36 && cursor < today; i++) {
    cursor = advanceRecurringDate(cursor, "monthly");
  }
  return cursor;
}

function suggestRepeats(lines: StatementLine[], today: string): RepeatSuggestion[] {
  const groups = new Map<
    string,
    {
      name: string;
      category: string;
      direction: "in" | "out";
      months: Map<string, number>;
      lastDate: string;
    }
  >();

  for (const line of lines) {
    if (!line.txn_date) continue;
    const role = line.line_role ?? "purchase";
    if (role === "card_payment" || role === "transfer") continue;
    const spend = countsTowardSpend({ direction: role === "income" ? "in" : "out", line_role: role });
    if (!spend && role !== "income") continue;
    const keyName = merchantKey(line.description);
    if (!keyName) continue;
    const direction = role === "income" ? "in" : "out";
    const category = direction === "in" ? line.suggested_category || "paycheque" : line.suggested_category;
    const key = `${direction}|${category}|${keyName}`;
    const group = groups.get(key) ?? {
      name: keyName.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      category,
      direction,
      months: new Map<string, number>(),
      lastDate: line.txn_date,
    };
    const month = monthKey(line.txn_date);
    group.months.set(month, (group.months.get(month) ?? 0) + Number(line.amount));
    if (line.txn_date > group.lastDate) group.lastDate = line.txn_date;
    groups.set(key, group);
  }

  const repeats: RepeatSuggestion[] = [];
  for (const group of groups.values()) {
    if (group.months.size < 2) continue;
    const amounts = [...group.months.values()];
    const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const close = amounts.every((amount) => Math.abs(amount - average) <= Math.max(5, average * 0.2));
    if (!close || average <= 0) continue;
    repeats.push({
      name: group.name,
      amount: roundMoney(average),
      category: group.category,
      direction: group.direction,
      cadence: "monthly",
      nextDate: nextMonthlyDate(group.lastDate, today),
    });
  }

  return repeats.sort((a, b) => b.amount - a.amount).slice(0, 5);
}

/**
 * Average complete months. A statement that only covers the current month
 * is used once and marked partial, so the user still gets a starting picture.
 */
export function buildStatementBaseline(lines: StatementLine[], today: string): StatementBaseline | null {
  const dated = lines.filter((line) => line.txn_date && Number(line.amount) > 0);
  if (dated.length === 0) return null;

  const current = monthKey(today);
  const monthsPresent = [...new Set(dated.map((line) => monthKey(line.txn_date as string)))].sort();
  const complete = monthsPresent.filter((month) => month < current);
  const months = complete.length > 0 ? complete : monthsPresent;
  const partial = complete.length === 0;

  const totals = {
    income: 0,
    needs: 0,
    flexible: 0,
    creditCharges: 0,
    cardPayments: 0,
  };
  const flexible = new Map<string, number>();
  let hasCredit = false;
  let hasDebit = false;

  for (const line of dated) {
    const month = monthKey(line.txn_date as string);
    if (!months.includes(month)) continue;
    const role = line.line_role ?? "purchase";
    const amount = Number(line.amount) || 0;
    if (line.instrument === "credit") hasCredit = true;
    if (line.instrument !== "credit") hasDebit = true;

    if (role === "transfer") continue;
    if (role === "card_payment") {
      totals.cardPayments += amount;
      continue;
    }
    if (role === "income") {
      totals.income += amount;
      continue;
    }
    if (!countsTowardSpend({ direction: "out", line_role: role })) continue;
    if (line.instrument === "credit") totals.creditCharges += amount;
    if (isNeedCategory(line.suggested_category)) totals.needs += amount;
    else {
      totals.flexible += amount;
      flexible.set(line.suggested_category, (flexible.get(line.suggested_category) ?? 0) + amount);
    }
  }

  const count = months.length;
  const incomeMonthly = roundMoney(totals.income / count);
  const needsMonthly = roundMoney(totals.needs / count);
  const flexibleMonthly = roundMoney(totals.flexible / count);
  const leftMonthly = roundMoney(incomeMonthly - needsMonthly - flexibleMonthly);
  const creditGrowthMonthly = roundMoney((totals.creditCharges - totals.cardPayments) / count);
  const flexibleByCategory = [...flexible.entries()]
    .map(([category, amount]) => ({ category, monthly: roundMoney(amount / count) }))
    .filter((row) => row.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly);

  return {
    months,
    monthLabels: joinLabels(months.map(monthName)),
    partial,
    incomeMonthly,
    needsMonthly,
    flexibleMonthly,
    leftMonthly,
    creditGrowthMonthly,
    flexibleByCategory,
    hasCredit,
    hasDebit,
    repeats: suggestRepeats(
      dated.filter((line) => months.includes(monthKey(line.txn_date as string))),
      today,
    ),
    observation: baselineObservation({
      leftMonthly,
      flexibleMonthly,
      flexibleByCategory,
      creditGrowthMonthly,
    }),
  };
}
