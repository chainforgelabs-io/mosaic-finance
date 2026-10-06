import { describe, expect, it } from "vitest";
import { categorySlug, inferGoalType, isSpendingCategory, presentGoalName } from "@/lib/tracking/categories";
import {
  addDays,
  endOfMonth,
  monthKey,
  recentMonthStarts,
  spendHistoryHeading,
  startOfMonth,
  startOfWeekMonday,
} from "@/lib/tracking/dates";
import { parseHoldingsCsv } from "@/lib/tracking/holdings-csv";
import { holdingSchema } from "@/lib/schemas/holdings";
import { goalDraftToPayload, horizonFromStored } from "@/lib/tracking/goal-draft";
import { goalRowFromExtracted } from "@/lib/tracking/sync-goals";

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
    expect(endOfMonth("2026-08-15")).toBe("2026-08-31");
    expect(endOfMonth("2026-02-01")).toBe("2026-02-28");
  });

  it("lists recent months oldest first", () => {
    expect(recentMonthStarts("2026-10-06", 6)).toEqual([
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
    ]);
  });

  it("uses month language for the month spending chart", () => {
    expect(spendHistoryHeading("month")).toEqual({
      title: "Monthly spending",
      range: "Last 6 months",
      unit: "/mo",
    });
    expect(spendHistoryHeading("week").title).toBe("Weekly spending");
  });
});

describe("goal names", () => {
  it("turns stored keys into readable names", () => {
    expect(presentGoalName("debt_payoff")).toBe("Pay off debt");
    expect(presentGoalName("save_for_education")).toBe("Save for education");
    expect(presentGoalName("home_upgrade")).toBe("Home upgrade");
    expect(presentGoalName("travel")).toBe("Travel");
    expect(presentGoalName("Pay off debt")).toBe("Pay off debt");
  });

  it("builds a category slug from a label", () => {
    expect(categorySlug("Rental condo fees")).toBe("rental_condo_fees");
    expect(categorySlug("")).toBeNull();
  });
});

describe("holdings upload", () => {
  it("reads a brokerage csv and skips rows without a value", () => {
    const csv = [
      "Security name,Symbol,Quantity,Market value ($),Book value ($)",
      "Example Fund,EXF,10,1500,1400",
      "Missing Value,MISS,2,N/A,",
    ].join("\n");
    expect(parseHoldingsCsv(csv)).toEqual({
      holdings: [{ ticker: "EXF", name: "Example Fund", balance: 1500, units: 10 }],
      skipped: 1,
    });
  });

  it("accepts a null unit count", () => {
    const parsed = holdingSchema.safeParse({ tickerOrName: "Example Fund", balance: 1500, units: null });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.units).toBeUndefined();
  });
});

describe("category helpers", () => {
  it("maps fact-find labels onto goal types", () => {
    expect(inferGoalType("Emergency fund")).toBe("emergency_fund");
    expect(inferGoalType("pay off debt")).toBe("debt_payoff");
    expect(inferGoalType("Debt Paydown")).toBe("debt_payoff");
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

  it("turns a zero target into an unknown amount and uses retirement age", () => {
    expect(
      goalRowFromExtracted(
        { type: "Retirement", priority: "high", target_date: "2053-01-01", target_amount: 0 },
        60,
      ),
    ).toMatchObject({
      name: "Retirement",
      goal_type: "retirement",
      target_amount: null,
      amount_unknown: true,
      target_date: null,
      target_age: 60,
    });
  });

  it("treats a stored age without a date as an age horizon", () => {
    expect(horizonFromStored({ target_age: 55, target_date: null })).toBe("age");
    expect(horizonFromStored({ target_age: null, target_date: "2045-06-01" })).toBe("date");
  });
});
