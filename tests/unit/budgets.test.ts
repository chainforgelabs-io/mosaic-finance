import { describe, expect, it } from "vitest";

function weeklyBaselineFromBudgets(limits: number[]): number {
  const monthly = limits.reduce((s, n) => s + n, 0);
  return (monthly * 12) / 52;
}

describe("budget baseline math", () => {
  it("converts monthly category limits to a weekly baseline", () => {
    expect(weeklyBaselineFromBudgets([2000, 600])).toBeCloseTo((2600 * 12) / 52);
  });
});
