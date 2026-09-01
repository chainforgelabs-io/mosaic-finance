import { describe, expect, it } from "vitest";
import { inferGoalType, isSpendingCategory } from "@/lib/tracking/categories";
import { addDays, monthKey, startOfMonth, startOfWeekMonday } from "@/lib/tracking/dates";

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
