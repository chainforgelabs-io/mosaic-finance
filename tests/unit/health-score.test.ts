import { describe, expect, it } from "vitest";
import { calculateDerivedHealthScore } from "@/lib/calculations/health-score";

describe("calculateDerivedHealthScore", () => {
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
