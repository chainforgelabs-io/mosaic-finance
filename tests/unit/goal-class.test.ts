import { describe, expect, it } from "vitest";
import { inferGoalClass, measureGoal, type GoalAccount } from "@/lib/tracking/goal-class";

const loan: GoalAccount = { key: "loan-1", name: "Student loan", value: 8000, side: "debt" };
const loanBefore: GoalAccount = { key: "loan-1", name: "Student loan", value: 10000, side: "debt" };
const tfsa: GoalAccount = { key: "tfsa-1", name: "TFSA", value: 4200, side: "asset" };

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

  it("treats a stated retirement income as its own class", () => {
    expect(inferGoalClass({ name: "Retirement income", goalType: "retirement", targetAmount: 40000 })).toBe(
      "retirement_income",
    );
  });

  it("leaves an unmeasured discovery line as a note", () => {
    expect(inferGoalClass({ name: "Maintain cost of living", goalType: "other", amountUnknown: true })).toBe("note");
    expect(inferGoalClass({ name: "Travel", goalType: "vacation", targetAmount: 20000 })).toBe("balance");
  });
});

describe("goal measure", () => {
  it("measures a debt by the drop in the attached balance", () => {
    const measure = measureGoal(
      {
        name: "Student loan",
        goal_type: "debt_payoff",
        target_amount: null,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        linked_account_ids: ["loan-1"],
      },
      [loan],
      [loanBefore],
      0,
    );
    expect(measure.goalClass).toBe("debt");
    expect(measure.paidDown).toBe(2000);
    expect(measure.remaining).toBe(8000);
    expect(measure.bar).toBe(20);
  });

  it("measures a savings goal from the attached account", () => {
    const measure = measureGoal(
      {
        name: "Travel",
        goal_type: "vacation",
        target_amount: 20000,
        current_amount: 0,
        target_age: null,
        amount_unknown: false,
        linked_account_ids: ["tfsa-1"],
      },
      [tfsa],
      [],
      0,
    );
    expect(measure.current).toBe(4200);
    expect(measure.bar).toBe(21);
  });

  it("does not draw a progress bar for a retirement age", () => {
    const measure = measureGoal(
      {
        name: "Retirement",
        goal_type: "retirement",
        target_amount: null,
        current_amount: 0,
        target_age: 60,
        amount_unknown: true,
        linked_account_ids: ["tfsa-1"],
      },
      [tfsa],
      [],
      0,
    );
    expect(measure.goalClass).toBe("retirement_age");
    expect(measure.bar).toBeNull();
    expect(measure.current).toBe(4200);
  });
});
