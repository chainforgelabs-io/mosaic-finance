import { addDays } from "@/lib/tracking/dates";
import { transactionKind } from "@/lib/tracking/cash-capture";

/** Trailing window treated as one month of tracked cash flow. */
export const SCORE_WINDOW_DAYS = 30;

export interface ScoreTransaction {
  txn_date: string;
  amount: number;
  source?: string | null;
  line_role?: string | null;
  direction?: string | null;
  description?: string | null;
  category?: string | null;
}

export interface FactFindMoney {
  annualIncome: number | null;
  monthlyExpenses: number | null;
  monthlySavings: number | null;
  emergencyFundMonths: number | null;
  totalDebt: number | null;
}

export interface SnapshotMoney {
  /** Latest snapshot debt total. Zero is a real answer. */
  debtsTotal: number | null;
  /** Cash on hand when the snapshot says what cash is. Null when cash is unknown. */
  cash: number | null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

/**
 * Tracked cash flow and the latest snapshot win. The fact-find fills only
 * the pieces tracking does not have yet.
 */
export function moneyForHealthScore(input: {
  today: string;
  transactions: ScoreTransaction[];
  snapshot: SnapshotMoney | null;
  factFind: FactFindMoney;
}): FactFindMoney {
  const start = addDays(input.today, -(SCORE_WINDOW_DAYS - 1));
  const rows = input.transactions.filter((txn) => {
    if (txn.source === "screenshot") return false;
    if (txn.txn_date < start || txn.txn_date > input.today) return false;
    return Number.isFinite(Number(txn.amount)) && Number(txn.amount) > 0;
  });

  const expenses = rows.filter((txn) => transactionKind(txn) === "expense");
  const income = rows.filter((txn) => transactionKind(txn) === "income");
  const savings = rows.filter(
    (txn) => transactionKind(txn) === "savings" && txn.category !== "debt_principal",
  );

  const monthlyExpenses = expenses.length
    ? sum(expenses.map((txn) => Number(txn.amount)))
    : input.factFind.monthlyExpenses;
  const trackedIncome = income.length ? sum(income.map((txn) => Number(txn.amount))) : null;
  const annualIncome = trackedIncome != null ? roundMoney(trackedIncome * 12) : input.factFind.annualIncome;

  let monthlySavings = input.factFind.monthlySavings;
  if (savings.length) {
    monthlySavings = sum(savings.map((txn) => Number(txn.amount)));
  } else if (trackedIncome != null && expenses.length) {
    monthlySavings = roundMoney(trackedIncome - (monthlyExpenses ?? 0));
  }

  let emergencyFundMonths = input.factFind.emergencyFundMonths;
  const cash = input.snapshot?.cash;
  if (cash != null && monthlyExpenses != null && monthlyExpenses > 0) {
    emergencyFundMonths = Math.round((cash / monthlyExpenses) * 10) / 10;
  }

  const totalDebt =
    input.snapshot?.debtsTotal != null ? input.snapshot.debtsTotal : input.factFind.totalDebt;

  return {
    annualIncome,
    monthlyExpenses,
    monthlySavings,
    emergencyFundMonths,
    totalDebt,
  };
}

/** True when a snapshot breakdown actually names cash, so zero is not a guess. */
export function snapshotCash(breakdown: unknown): number | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const record = breakdown as {
    cash_total?: unknown;
    investments?: Array<{ account_type?: string | null; value?: unknown }>;
  };
  if (record.cash_total != null && Number.isFinite(Number(record.cash_total))) {
    return Number(record.cash_total);
  }
  const accounts = record.investments ?? [];
  const cashAccounts = accounts.filter((item) => {
    const type = String(item.account_type ?? "").toLowerCase();
    return (
      type === "bank-account" ||
      type === "bank account" ||
      type === "cash" ||
      type === "chequing" ||
      type === "savings"
    );
  });
  if (cashAccounts.length === 0) return null;
  return cashAccounts.reduce((total, item) => total + (Number(item.value) || 0), 0);
}
