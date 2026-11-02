import { isSavings, transactionKind } from "@/lib/tracking/cash-capture";
import { addDays, startOfMonth, startOfWeekMonday } from "@/lib/tracking/dates";

export interface SpendingFacts {
  loggedByCategory: Record<string, number>;
  spendByMonthCategory: Record<string, number>;
  expenseDates: string[];
  monthExpense: number;
}

/** The same spending totals the Goals page uses to measure a goal. */
export function spendingFactsFromTransactions(transactions: unknown, today: string): SpendingFacts {
  const month = startOfMonth(today);
  const weekStart = addDays(startOfWeekMonday(today), -21);
  const loggedByCategory: Record<string, number> = {};
  const spendByMonthCategory: Record<string, number> = {};
  const expenseDates: string[] = [];
  let monthExpense = 0;
  const txns = Array.isArray(transactions) ? transactions : [];
  for (const txn of txns) {
    if (!txn || typeof txn !== "object") continue;
    const row = txn as { txn_date?: unknown; amount?: unknown; category?: unknown };
    const date = String(row.txn_date ?? "");
    const amount = Number(row.amount) || 0;
    if (isSavings(txn) && row.category && date >= month) {
      const category = String(row.category);
      loggedByCategory[category] = (loggedByCategory[category] ?? 0) + amount;
    }
    if (transactionKind(txn) === "expense") {
      if (row.category) {
        const key = `${date.slice(0, 7)}:${String(row.category)}`;
        spendByMonthCategory[key] = (spendByMonthCategory[key] ?? 0) + amount;
      }
      if (date >= month) monthExpense += amount;
      if (date >= weekStart) expenseDates.push(date);
    }
  }
  return { loggedByCategory, spendByMonthCategory, expenseDates, monthExpense };
}
