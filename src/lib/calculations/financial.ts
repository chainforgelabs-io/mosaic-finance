export interface DebtInfo {
  type: string;
  balance: number;
  rate: number;
  monthly_payment: number;
}

export function calculateSavingsRate(
  annualIncome: number,
  monthlyExpenses: number,
): number {
  if (annualIncome <= 0) return 0;
  const monthlyIncome = annualIncome / 12;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  return Math.max(0, Math.min(100, (monthlySavings / monthlyIncome) * 100));
}

export function calculateEmergencyFundMonths(
  emergencyFund: number,
  monthlyExpenses: number,
): number {
  if (monthlyExpenses <= 0) return 0;
  return emergencyFund / monthlyExpenses;
}

/**
 * Future value of current savings + ongoing monthly contributions,
 * compounded annually at `annualReturnRate`.
 */
export function calculateRetirementNumber(
  currentSavings: number,
  monthlySavings: number,
  yearsUntilRetirement: number,
  annualReturnRate: number = 0.06,
): number {
  if (yearsUntilRetirement <= 0) return currentSavings;
  const r = annualReturnRate;
  const n = yearsUntilRetirement;

  const futureValueLumpSum = currentSavings * Math.pow(1 + r, n);

  const monthlyRate = r / 12;
  const months = n * 12;
  const futureValueContributions =
    monthlySavings *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return Math.round(futureValueLumpSum + futureValueContributions);
}

/**
 * Debt avalanche: pay minimum on all debts, throw extra at highest-rate debt first.
 * Returns total interest paid and months to payoff.
 */
export function calculateDebtAvalanche(
  debts: DebtInfo[],
  extraMonthlyPayment: number = 0,
): { order: string[]; totalInterestPaid: number; payoffMonths: number } {
  if (debts.length === 0) {
    return { order: [], totalInterestPaid: 0, payoffMonths: 0 };
  }

  const sorted = [...debts].sort((a, b) => b.rate - a.rate);
  const balances = sorted.map((d) => d.balance);
  const rates = sorted.map((d) => d.rate / 100 / 12);
  const minPayments = sorted.map((d) => d.monthly_payment);

  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600;

  while (balances.some((b) => b > 0.01) && months < maxMonths) {
    months++;
    let availableExtra = extraMonthlyPayment;

    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;

      const interest = balances[i] * rates[i];
      totalInterest += interest;
      balances[i] += interest;

      const payment = Math.min(balances[i], minPayments[i]);
      balances[i] -= payment;
    }

    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0 || availableExtra <= 0) continue;
      const extra = Math.min(balances[i], availableExtra);
      balances[i] -= extra;
      availableExtra -= extra;
      break;
    }
  }

  return {
    order: sorted.map((d) => d.type),
    totalInterestPaid: Math.round(totalInterest * 100) / 100,
    payoffMonths: months,
  };
}

/**
 * Debt snowball: pay minimum on all, throw extra at smallest balance first.
 */
export function calculateDebtSnowball(
  debts: DebtInfo[],
  extraMonthlyPayment: number = 0,
): { order: string[]; totalInterestPaid: number; payoffMonths: number } {
  if (debts.length === 0) {
    return { order: [], totalInterestPaid: 0, payoffMonths: 0 };
  }

  const sorted = [...debts].sort((a, b) => a.balance - b.balance);
  const balances = sorted.map((d) => d.balance);
  const rates = sorted.map((d) => d.rate / 100 / 12);
  const minPayments = sorted.map((d) => d.monthly_payment);

  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600;

  while (balances.some((b) => b > 0.01) && months < maxMonths) {
    months++;
    let availableExtra = extraMonthlyPayment;

    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;

      const interest = balances[i] * rates[i];
      totalInterest += interest;
      balances[i] += interest;

      const payment = Math.min(balances[i], minPayments[i]);
      balances[i] -= payment;
    }

    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0 || availableExtra <= 0) continue;
      const extra = Math.min(balances[i], availableExtra);
      balances[i] -= extra;
      availableExtra -= extra;
      break;
    }
  }

  return {
    order: sorted.map((d) => d.type),
    totalInterestPaid: Math.round(totalInterest * 100) / 100,
    payoffMonths: months,
  };
}

export function calculateNetWorth(
  totalAssets: number,
  totalDebts: number,
): number {
  return totalAssets - totalDebts;
}

export function calculateMonthlyCashFlow(
  annualIncome: number,
  monthlyExpenses: number,
): number {
  return annualIncome / 12 - monthlyExpenses;
}
