import { describe, expect, it } from "vitest";
import {
  CANADA_LIFE_EXPECTANCY_YEARS,
  inferGoalClass,
  monthShare,
  readGoal,
  startingDebts,
  weeksWithSpending,
  type GoalAccount,
} from "@/lib/tracking/goal-class";

const loan: GoalAccount = { key: "loan-1", name: "Student loan", value: 8000, side: "debt" };
const loanStart: GoalAccount = { key: "loan-1", name: "Student loan", value: 10000, side: "debt" };
const card: GoalAccount = { key: "card-1", name: "Card", value: 1200, side: "debt" };
const tfsa: GoalAccount = { key: "tfsa-1", name: "TFSA", value: 4200, side: "asset", accountType: "TFSA" };
const rrsp: GoalAccount = { key: "rrsp-1", name: "RRSP", value: 50000, side: "asset", accountType: "RRSP" };

const emptyFacts = {
  today: "2026-11-01",
  age: 46,
  exampleMonthly: 4200,
  planExpense: 4200,
  monthExpense: 3800,
  expenseDates: ["2026-10-12", "2026-10-20", "2026-11-01"],
  latest: [] as GoalAccount[],
  startDebts: [] as GoalAccount[],
  loggedByCategory: {} as Record<string, number>,
};

describe("goal class from the name", () => {
  it("keeps a retirement age separate from a debt payoff", () => {
    expect(inferGoalClass({ name: "Retirement", goalType: "retirement", amountUnknown: true, targetAge: 60 })).toBe(
      "retirement_age",
    );
    expect(inferGoalClass({ name: "Pay off the mortgage", goalType: "other" })).toBe("debt");
    expect(inferGoalClass({ name: "Home down payment", goalType: "home_purchase", targetAmount: 40000 })).toBe(
      "balance",
    );
  });

  it("treats cost of living as its own measure and leaves a one-off name generic", () => {
    expect(inferGoalClass({ name: "Maintain cost of living", goalType: "other", amountUnknown: true })).toBe(
      "cost_of_living",
    );
    expect(inferGoalClass({ name: "Not sure yet", goalType: "other", amountUnknown: true })).toBe("note");
    expect(inferGoalClass({ name: "Travel", goalType: "vacation", targetAmount: 20000 })).toBe("balance");
  });
});

describe("goal reading", () => {
  it("measures a debt from the balance when the goal began", () => {
    const reading = readGoal(
      {
        name: "Pay off debt",
        goal_type: "debt_payoff",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        baseline_balances: { "loan-1": 10000, "card-1": 1200 },
      },
      { ...emptyFacts, latest: [loan, { ...card, value: 1200 }], startDebts: [loanStart, card] },
    );
    expect(reading.goalClass).toBe("debt");
    if (reading.goalClass !== "debt") return;
    expect(reading.paidDown).toBe(2000);
    expect(reading.stillOwed).toBe(9200);
    expect(reading.rows).toHaveLength(2);
    expect(reading.bar).toBeCloseTo((2000 / 11200) * 100);
  });

  it("does not treat a typed zero as savings progress", () => {
    const reading = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
      },
      { ...emptyFacts, latest: [tfsa] },
    );
    expect(reading.goalClass).toBe("balance");
    if (reading.goalClass !== "balance") return;
    expect(reading.current).toBeNull();
    expect(reading.bar).toBeNull();
    expect(reading.needsAccount).toBe(true);
  });

  it("uses the attached account once a savings goal has one", () => {
    const reading = readGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        linked_account_ids: ["tfsa-1"],
        linked_plan_categories: ["vacation"],
      },
      { ...emptyFacts, latest: [tfsa], loggedByCategory: { vacation: 150 } },
    );
    if (reading.goalClass !== "balance") throw new Error("expected balance");
    expect(reading.current).toBe(4200);
    expect(reading.bar).toBe(21);
    expect(reading.loggedThisMonth).toBe(150);
  });

  it("states a retirement gap in today's dollars without a return", () => {
    const reading = readGoal(
      {
        name: "Retirement",
        goal_type: "retirement",
        target_amount: null,
        current_amount: 0,
        target_age: 60,
        amount_unknown: true,
        monthly_need: 4200,
      },
      { ...emptyFacts, latest: [rrsp, tfsa] },
    );
    if (reading.goalClass !== "retirement_age") throw new Error("expected retirement");
    expect(reading.yearsUntil).toBe(14);
    expect(reading.yearsInRetirement).toBe(CANADA_LIFE_EXPECTANCY_YEARS - 60);
    expect(reading.spendingTotal).toBe(4200 * 12 * (CANADA_LIFE_EXPECTANCY_YEARS - 60));
    expect(reading.balance).toBe(54200);
    expect(reading.gap).toBe(reading.spendingTotal! - 54200);
    expect(reading.bar).toBeNull();
  });

  it("counts weeks logged and the month against the plan", () => {
    const reading = readGoal(
      {
        name: "Maintain cost of living",
        goal_type: "other",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: true,
      },
      emptyFacts,
    );
    if (reading.goalClass !== "cost_of_living") throw new Error("expected cost of living");
    expect(reading.weeksLogged).toBe(weeksWithSpending(emptyFacts.expenseDates, emptyFacts.today));
    expect(reading.weeksLogged).toBe(3);
    expect(reading.budget).toBe(4200);
    expect(reading.tracked).toBe(3800);
    expect(reading.budgetSource).toBe("plan");
    expect(reading.monthComplete).toBe(false);
    expect(reading.day).toBe(1);
    expect(reading.days).toBe(30);
    expect(reading.pace).toBe(Math.round(4200 / 30));
  });

  it("compares cost of living with the full plan only on the last day", () => {
    const reading = readGoal(
      {
        name: "Maintain cost of living",
        goal_type: "other",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: true,
      },
      { ...emptyFacts, today: "2026-11-30" },
    );
    if (reading.goalClass !== "cost_of_living") throw new Error("expected cost of living");
    expect(monthShare("2026-11-30").complete).toBe(true);
    expect(reading.monthComplete).toBe(true);
    expect(reading.pace).toBe(4200);
    expect(monthShare("2026-02-28")).toEqual({ day: 28, days: 28, complete: true });
  });
});

describe("starting debts", () => {
  it("uses the check-in on or before the goal was created", () => {
    const debts = startingDebts(
      [
        { date: "2026-09-01", accounts: [loanStart] },
        { date: "2026-11-01", accounts: [loan] },
      ],
      "2026-10-15",
    );
    expect(debts.map((account) => account.value)).toEqual([10000]);
  });
});
