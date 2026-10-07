import { describe, expect, it } from "vitest";
import { computeDebtNumbers, reconcileDebtPlan } from "@/lib/plan/reconcile-debt-plan";

const debts = [
  { type: "mortgage", amount: 200000, balance: 200000, rate: 4, monthly_payment: 1800 },
  { type: "car_loan", amount: 18000, balance: 18000, rate: 0, monthly_payment: 500 },
];

describe("computeDebtNumbers", () => {
  it("amortizes the debts on file", () => {
    const numbers = computeDebtNumbers(debts);
    expect(numbers).not.toBeNull();
    expect(numbers!.totalDebt).toBe(218000);
    expect(numbers!.avalanche.payoffMonths).toBe(140);
    expect(numbers!.avalanche.totalInterestPaid).toBe(50233);
    // With no extra payment and a 0% loan, both methods cost the same.
    expect(numbers!.snowball.totalInterestPaid).toBe(numbers!.avalanche.totalInterestPaid);
  });

  it("returns null when a payment is missing or the balance never clears", () => {
    expect(computeDebtNumbers([{ type: "loc", balance: 10000, rate: 8 }])).toBeNull();
    expect(computeDebtNumbers([{ type: "loc", balance: 10000, rate: 24, monthly_payment: 100 }])).toBeNull();
    expect(computeDebtNumbers([])).toBeNull();
    expect(computeDebtNumbers(null)).toBeNull();
  });
});

describe("reconcileDebtPlan", () => {
  it("replaces the model's payoff numbers and keeps its prose and order", () => {
    const plan = {
      debt_elimination_plan: {
        total_debt: 218000,
        avalanche_method: { order: ["Mortgage (4%)", "Car loan (0%)"], payoff_months: 180, total_interest_paid: 88000 },
        snowball_method: { order: ["Car loan (0%)", "Mortgage (4%)"], payoff_months: 180, total_interest_paid: 92000 },
        recommended_method: "Avalanche",
        action_items: ["Keep the car loan at minimum."],
      },
      retirement_readiness: { gap_analysis: "untouched" },
    };
    const out = reconcileDebtPlan(plan, debts);
    const dep = out.debt_elimination_plan as Record<string, Record<string, unknown>>;
    expect(dep.avalanche_method.payoff_months).toBe(140);
    expect(dep.avalanche_method.total_interest_paid).toBe(50233);
    expect(dep.snowball_method.payoff_months).toBe(140);
    expect(dep.avalanche_method.order).toEqual(["Mortgage (4%)", "Car loan (0%)"]);
    expect(dep.recommended_method).toBe("Avalanche");
    expect(out.retirement_readiness).toEqual({ gap_analysis: "untouched" });
    // input is not mutated
    expect(plan.debt_elimination_plan.avalanche_method.payoff_months).toBe(180);
  });

  it("leaves the plan alone when the debts cannot be simulated", () => {
    const plan = { debt_elimination_plan: { avalanche_method: { payoff_months: 60 } } };
    expect(reconcileDebtPlan(plan, [{ type: "x", balance: 5000, rate: 5 }])).toBe(plan);
    expect(reconcileDebtPlan({ other: 1 }, debts)).toEqual({ other: 1 });
  });
});
