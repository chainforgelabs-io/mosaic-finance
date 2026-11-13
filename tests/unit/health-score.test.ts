import { describe, expect, it } from "vitest";
import {
  calculateDerivedHealthScore,
  savingsRateForScore,
} from "@/lib/calculations/health-score";
import { moneyForHealthScore, snapshotCash } from "@/lib/health-score/from-tracking";
import { loopEventsForLog, secondsSinceSignup } from "@/lib/analytics/loop-events";
import { weeklyLogReminderIds } from "@/lib/tracking/weekly-log-reminder";

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

const factFind = {
  annualIncome: 174996,
  monthlyExpenses: 4200,
  monthlySavings: 1116,
  emergencyFundMonths: 1.9,
  totalDebt: 218000,
};

describe("moneyForHealthScore", () => {
  it("lets savings lines, tracked spending, and the snapshot replace the fact-find", () => {
    const money = moneyForHealthScore({
      today: "2026-11-13",
      transactions: [
        { txn_date: "2026-11-01", amount: 4000, line_role: "income", direction: "in" },
        { txn_date: "2026-11-02", amount: 500, line_role: "purchase", direction: "out", category: "groceries" },
        { txn_date: "2026-11-03", amount: 300, line_role: "savings", direction: "out", category: "tfsa" },
        { txn_date: "2026-11-04", amount: 200, line_role: "savings", direction: "out", category: "debt_principal" },
        { txn_date: "2026-10-01", amount: 9000, line_role: "purchase", direction: "out", category: "other" },
        { txn_date: "2026-11-05", amount: 800, source: "screenshot", line_role: "purchase", direction: "out" },
      ],
      snapshot: { debtsTotal: 0, cash: 1500 },
      factFind,
    });
    expect(money.monthlySavings).toBe(300);
    expect(money.monthlyExpenses).toBe(500);
    expect(money.annualIncome).toBe(48000);
    expect(money.emergencyFundMonths).toBe(3);
    expect(money.totalDebt).toBe(0);
  });

  it("falls back to the fact-find when nothing has been tracked", () => {
    expect(
      moneyForHealthScore({
        today: "2026-11-13",
        transactions: [],
        snapshot: null,
        factFind,
      }),
    ).toEqual(factFind);
  });

  it("reads cash only when the snapshot names it", () => {
    expect(snapshotCash({ cash_total: 1200 })).toBe(1200);
    expect(snapshotCash({ investments: [{ account_type: "tfsa", value: 5000 }] })).toBeNull();
    expect(snapshotCash({ investments: [{ account_type: "chequing", value: 400 }] })).toBe(400);
  });
});

describe("loop events", () => {
  it("marks the first log and a log in the second week", () => {
    expect(
      loopEventsForLog({
        signupOn: "2026-11-04",
        loggedOn: "2026-11-04",
        priorLogDates: [],
      }),
    ).toEqual(["first_log"]);
    expect(
      loopEventsForLog({
        signupOn: "2026-11-04",
        loggedOn: "2026-11-11",
        priorLogDates: ["2026-11-04"],
      }),
    ).toEqual(["log_week_2"]);
    expect(
      loopEventsForLog({
        signupOn: "2026-11-04",
        loggedOn: "2026-11-12",
        priorLogDates: ["2026-11-04", "2026-11-11"],
      }),
    ).toEqual([]);
  });

  it("counts seconds from signup", () => {
    expect(secondsSinceSignup("2026-11-13T00:00:00.000Z", new Date("2026-11-13T00:01:00.000Z"))).toBe(60);
  });
});

describe("weekly log reminder", () => {
  it("emails once per week, and skips a week that was logged or turned off", () => {
    expect(
      weeklyLogReminderIds("2026-11-09", [
        { id: "due", remindersOn: true, sentFor: null, loggedThisWeek: false },
        { id: "logged", remindersOn: true, sentFor: null, loggedThisWeek: true },
        { id: "sent", remindersOn: true, sentFor: "2026-11-09", loggedThisWeek: false },
        { id: "off", remindersOn: false, sentFor: null, loggedThisWeek: false },
      ]),
    ).toEqual(["due"]);
  });
});
