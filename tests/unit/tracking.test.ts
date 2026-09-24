import { describe, expect, it } from "vitest";
import { inferGoalType, isSpendingCategory } from "@/lib/tracking/categories";
import { addDays, monthKey, startOfMonth, startOfWeekMonday } from "@/lib/tracking/dates";
import { goalDraftToPayload, horizonFromStored } from "@/lib/tracking/goal-draft";

describe("tracking date helpers", () => {
  it("starts weeks on Monday", () => {
    expect(startOfWeekMonday("2026-08-31")).toBe("2026-08-31");
    expect(startOfWeekMonday("2026-09-02")).toBe("2026-08-31");
    expect(startOfWeekMonday("2026-08-30")).toBe("2026-08-24");
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-08-31", -7)).toBe("2026-08-24");
  });

  it("derives month keys", () => {
    expect(monthKey("2026-08-31")).toBe("2026-08");
    expect(startOfMonth("2026-08-31")).toBe("2026-08-01");
  });
});

describe("category helpers", () => {
  it("maps fact-find labels onto goal types", () => {
    expect(inferGoalType("Emergency fund")).toBe("emergency_fund");
    expect(inferGoalType("pay off debt")).toBe("debt_payoff");
    expect(inferGoalType("house")).toBe("home_purchase");
    expect(inferGoalType("custom dream")).toBe("other");
  });

  it("validates spending categories", () => {
    expect(isSpendingCategory("groceries")).toBe(true);
    expect(isSpendingCategory("not-a-category")).toBe(false);
  });
});

describe("goal draft payload", () => {
  const base = {
    name: "  Retire early  ",
    goal_type: "retirement",
    target_amount: "250000",
    amount_unknown: false,
    horizon: "date" as const,
    target_date: "2045-06-01",
    target_age: "55",
    priority: "high",
  };

  it("keeps a date and drops the age", () => {
    expect(goalDraftToPayload(base)).toMatchObject({
      name: "Retire early",
      target_amount: 250000,
      amount_unknown: false,
      target_date: "2045-06-01",
      target_age: null,
    });
  });

  it("keeps an age and drops the date", () => {
    expect(goalDraftToPayload({ ...base, horizon: "age" })).toMatchObject({
      target_date: null,
      target_age: 55,
    });
  });

  it("clears the amount when the user is not sure", () => {
    expect(
      goalDraftToPayload({ ...base, amount_unknown: true, horizon: "age" }),
    ).toMatchObject({
      target_amount: null,
      amount_unknown: true,
      target_age: 55,
      target_date: null,
    });
  });

  it("treats a stored age without a date as an age horizon", () => {
    expect(horizonFromStored({ target_age: 55, target_date: null })).toBe("age");
    expect(horizonFromStored({ target_age: null, target_date: "2045-06-01" })).toBe("date");
  });
});
