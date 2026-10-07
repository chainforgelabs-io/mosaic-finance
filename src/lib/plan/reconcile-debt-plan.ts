import {
  calculateDebtAvalanche,
  calculateDebtSnowball,
  type DebtInfo,
} from "@/lib/calculations/financial";

const SIMULATION_CAP_MONTHS = 600;

export interface ReconciledDebtNumbers {
  totalDebt: number;
  avalanche: { payoffMonths: number; totalInterestPaid: number };
  snowball: { payoffMonths: number; totalInterestPaid: number };
}

function asDebt(raw: unknown): DebtInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as { type?: unknown; amount?: unknown; balance?: unknown; rate?: unknown; monthly_payment?: unknown };
  const balance = Number(d.amount ?? d.balance);
  const rate = Number(d.rate ?? 0);
  const payment = Number(d.monthly_payment);
  if (!Number.isFinite(balance) || balance <= 0) return null;
  if (!Number.isFinite(rate) || rate < 0) return null;
  if (!Number.isFinite(payment) || payment <= 0) return null;
  return { type: String(d.type ?? "debt"), balance, rate, monthly_payment: payment };
}

/**
 * Deterministic payoff math for the debts on file. Returns null when the
 * recorded debts cannot be simulated (missing payments, or a payment that
 * never clears the balance), in which case the report keeps its own figures.
 */
export function computeDebtNumbers(majorDebts: unknown): ReconciledDebtNumbers | null {
  if (!Array.isArray(majorDebts) || majorDebts.length === 0) return null;
  const debts = majorDebts.map(asDebt);
  if (debts.some((d) => d == null)) return null;
  const list = debts as DebtInfo[];

  const avalanche = calculateDebtAvalanche(list);
  const snowball = calculateDebtSnowball(list);
  if (avalanche.payoffMonths >= SIMULATION_CAP_MONTHS || snowball.payoffMonths >= SIMULATION_CAP_MONTHS) {
    return null;
  }

  return {
    totalDebt: list.reduce((sum, d) => sum + d.balance, 0),
    avalanche: { payoffMonths: avalanche.payoffMonths, totalInterestPaid: Math.round(avalanche.totalInterestPaid) },
    snowball: { payoffMonths: snowball.payoffMonths, totalInterestPaid: Math.round(snowball.totalInterestPaid) },
  };
}

/**
 * The model is asked to describe the debt plan, not to do amortization. Its
 * payoff months and interest totals are estimates and have been off by years.
 * Overwrite those three numbers with the calculator's output; leave prose,
 * ordering, and everything else as generated.
 */
export function reconcileDebtPlan(
  planData: Record<string, unknown>,
  majorDebts: unknown,
): Record<string, unknown> {
  const numbers = computeDebtNumbers(majorDebts);
  if (!numbers) return planData;

  const section = planData.debt_elimination_plan;
  if (!section || typeof section !== "object") return planData;
  const debtPlan = { ...(section as Record<string, unknown>) };

  const patchMethod = (key: "avalanche_method" | "snowball_method", values: { payoffMonths: number; totalInterestPaid: number }) => {
    const existing = debtPlan[key];
    const base = existing && typeof existing === "object" ? (existing as Record<string, unknown>) : {};
    debtPlan[key] = {
      ...base,
      payoff_months: values.payoffMonths,
      total_interest_paid: values.totalInterestPaid,
    };
  };

  debtPlan.total_debt = numbers.totalDebt;
  patchMethod("avalanche_method", numbers.avalanche);
  patchMethod("snowball_method", numbers.snowball);

  return { ...planData, debt_elimination_plan: debtPlan };
}
