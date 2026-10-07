import { describe, expect, it } from "vitest";
import {
  calculateDerivedHealthScore,
  savingsRateForScore,
} from "@/lib/calculations/health-score";

describe("savingsRateForScore", () => {
  it("prefers the stated monthly savings over income minus partial expenses", () => {
    // Fact-find expenses exclude tax and debt service, so income/12 - expenses
    // would read 71% here; the household actually saves $1,116 of $14,583.
    const rate = savingsRateForScore({
      annualIncome: 174996,
      monthlyExpenses: 4200,
      monthlySavings: 1116,
    });
    expect(rate).toBeCloseTo(7.65, 1);
  });

  it("falls back to income minus expenses when savings are not stated", () => {
    expect(savingsRateForScore({ annualIncome: 120000, monthlyExpenses: 8000 })).toBe(20);
    expect(savingsRateForScore({ annualIncome: 120000, monthlyExpenses: 8000, monthlySavings: null })).toBe(20);
  });

  it("returns null without income", () => {
    expect(savingsRateForScore({ annualIncome: null, monthlyExpenses: 4000, monthlySavings: 500 })).toBeNull();
    expect(savingsRateForScore({ annualIncome: 0, monthlyExpenses: 4000 })).toBeNull();
  });
});

describe("calculateDerivedHealthScore", () => {
  it("uses stated monthly savings for the savings component", () => {
    const base = {
      annualIncome: 174996,
      monthlyExpenses: 4200,
      emergencyFundMonths: 1.9,
      totalDebt: 218000,
      netWorth: 336000,
      priorNetWorth: null,
      weeklyStreak: 1,
      monthlySnapshotStreak: 0,
      activeGoals: 5,
      achievedGoals: 0,
    };
    const without = calculateDerivedHealthScore(base);
    const withSavings = calculateDerivedHealthScore({ ...base, monthlySavings: 1116 });
    expect(without.breakdown.savings).toBe(100);
    expect(withSavings.breakdown.savings).toBe(50);
    expect(withSavings.score).toBeLessThan(without.score);
  });

  it("credits a known positive net worth even before the first snapshot", () => {
    const inputs = {
      annualIncome: 100000,
      monthlyExpenses: 5000,
      emergencyFundMonths: 3,
      totalDebt: 20000,
      priorNetWorth: null,
      weeklyStreak: 0,
      monthlySnapshotStreak: 0,
      activeGoals: 1,
      achievedGoals: 0,
    };
    const unknown = calculateDerivedHealthScore({ ...inputs, netWorth: null });
    const known = calculateDerivedHealthScore({ ...inputs, netWorth: 336000 });
    expect(unknown.breakdown.netWorthTrend).toBe(40);
    expect(known.breakdown.netWorthTrend).toBe(75);
  });

  it("scores a strong tracker highly", () => {
    const { score, breakdown } = calculateDerivedHealthScore({
      annualIncome: 100000,
      monthlyExpenses: 4000,
      emergencyFundMonths: 8,
      totalDebt: 5000,
      netWorth: 80000,
      priorNetWorth: 70000,
      weeklyStreak: 12,
      monthlySnapshotStreak: 6,
      activeGoals: 2,
      achievedGoals: 1,
    });
    expect(score).toBeGreaterThan(75);
    expect(breakdown.emergency).toBe(100);
    expect(breakdown.consistency).toBeGreaterThan(80);
  });

  it("stays in range with empty inputs", () => {
    const { score } = calculateDerivedHealthScore({
      annualIncome: null,
      monthlyExpenses: null,
      emergencyFundMonths: null,
      totalDebt: null,
      netWorth: null,
      priorNetWorth: null,
      weeklyStreak: 0,
      monthlySnapshotStreak: 0,
      activeGoals: 0,
      achievedGoals: 0,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
