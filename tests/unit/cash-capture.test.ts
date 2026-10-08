import { describe, expect, it } from "vitest";
import {
  advanceRecurringDate,
  amountFromDigits,
  balanceGap,
  cashEffect,
  countsTowardSpend,
  expectedBalance,
  formatAmountInput,
  gapBooking,
  isSavings,
  leftToSpend,
  occurrencesInRange,
  predictCategories,
  predictSavingsCategories,
  splitLines,
  transactionKind,
} from "@/lib/tracking/cash-capture";

describe("cents keypad", () => {
  it("reads digits as cents", () => {
    expect(amountFromDigits("")).toBe(0);
    expect(amountFromDigits("5")).toBe(0.05);
    expect(amountFromDigits("640")).toBe(6.4);
    expect(amountFromDigits("100")).toBe(1);
    expect(formatAmountInput("640")).toBe("6.40");
  });
});

describe("scheduled dates", () => {
  it("advances weekly, biweekly, and month-end dates", () => {
    expect(advanceRecurringDate("2026-10-05", "weekly")).toBe("2026-10-12");
    expect(advanceRecurringDate("2026-10-05", "biweekly")).toBe("2026-10-19");
    expect(advanceRecurringDate("2026-01-15", "monthly")).toBe("2026-02-15");
    expect(advanceRecurringDate("2026-01-31", "monthly")).toBe("2026-02-28");
  });

  it("lists only occurrences inside the period", () => {
    expect(occurrencesInRange("2026-10-01", "weekly", "2026-10-05", "2026-10-18")).toEqual([
      "2026-10-08",
      "2026-10-15",
    ]);
  });
});

describe("expected balance", () => {
  const txns = [
    { txn_date: "2026-10-01", amount: 20, direction: "out" },
    { txn_date: "2026-10-03", amount: 6.4, direction: "out" },
    { txn_date: "2026-10-04", amount: 100, direction: "in" },
  ];

  it("ignores transactions on or before the anchor date", () => {
    expect(expectedBalance(500, "2026-10-01", txns, "2026-10-04")).toBe(593.6);
  });

  it("books a shortfall as untracked spending and a surplus as money in", () => {
    expect(balanceGap(450, 493)).toBe(-43);
    expect(gapBooking(450, 493)).toEqual({ direction: "out", amount: 43 });
    expect(gapBooking(510, 493)).toEqual({ direction: "in", amount: 17 });
    expect(gapBooking(493, 493)).toBeNull();
  });
});

describe("left to spend", () => {
  it("subtracts posted spending and bills still due from income in the period", () => {
    const result = leftToSpend({
      periodStart: "2026-10-05",
      periodEnd: "2026-10-11",
      txns: [{ txn_date: "2026-10-06", amount: 6, direction: "out" }],
      recurring: [
        {
          id: "rent",
          amount: 2000,
          direction: "out",
          next_date: "2026-10-08",
          cadence: "monthly",
          active: true,
        },
        {
          id: "pay",
          amount: 3000,
          direction: "in",
          next_date: "2026-10-09",
          cadence: "biweekly",
          active: true,
        },
      ],
      monthlyRoom: null,
      period: "week",
    });
    expect(result.left).toBe(994);
    expect(result.usesBudget).toBe(false);
  });

  it("uses the monthly room when no income is scheduled in the period", () => {
    const result = leftToSpend({
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      txns: [{ txn_date: "2026-10-06", amount: 100, direction: "out" }],
      recurring: [],
      monthlyRoom: 4000,
      period: "month",
    });
    expect(result.left).toBe(3900);
    expect(result.usesBudget).toBe(true);
  });

  it("treats money set aside as leaving the account without calling it spending or income", () => {
    const result = leftToSpend({
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      txns: [
        { txn_date: "2026-10-02", amount: 3000, direction: "in", line_role: "income" },
        { txn_date: "2026-10-03", amount: 500, direction: "out", line_role: "savings", category: "tfsa" },
        { txn_date: "2026-10-06", amount: 100, direction: "out" },
      ],
      recurring: [],
      monthlyRoom: null,
      period: "month",
    });
    expect(result.income).toBe(3000);
    expect(result.spent).toBe(100);
    expect(result.savings).toBe(500);
    expect(result.left).toBe(2400);
  });
});

describe("savings role", () => {
  it("never counts toward spending and still moves the bank balance", () => {
    const saved = { txn_date: "2026-10-03", amount: 500, direction: "out", line_role: "savings" };
    expect(countsTowardSpend(saved)).toBe(false);
    expect(isSavings(saved)).toBe(true);
    expect(transactionKind(saved)).toBe("savings");
    expect(cashEffect(saved)).toBe(-500);
  });

  it("sorts logged lines into income, expense, savings, or neutral", () => {
    expect(transactionKind({ direction: "in", line_role: "income" })).toBe("income");
    expect(transactionKind({ direction: "out", line_role: "purchase" })).toBe("expense");
    expect(transactionKind({ direction: "out", line_role: "card_payment" })).toBe("neutral");
    expect(transactionKind({ direction: "out" })).toBe("expense");
  });

  it("suggests the savings accounts used most, then defaults", () => {
    const history = [
      { txn_date: "2026-09-01", amount: 200, direction: "out", line_role: "savings", category: "fhsa" },
      { txn_date: "2026-09-15", amount: 200, direction: "out", line_role: "savings", category: "fhsa" },
      { txn_date: "2026-09-20", amount: 50, direction: "out", category: "dining" },
    ];
    expect(predictSavingsCategories(history)).toEqual(["fhsa", "tfsa", "rrsp", "cash_savings"]);
  });
});

describe("predicted categories", () => {
  it("prefers the category you usually log at this time and amount", () => {
    const now = new Date(2026, 9, 7, 19, 0, 0);
    const history = [
      {
        category: "dining",
        amount: 14,
        direction: "out",
        txn_date: "2026-09-30",
        created_at: "2026-09-30T19:05:00",
      },
      {
        category: "groceries",
        amount: 80,
        direction: "out",
        txn_date: "2026-10-03",
        created_at: "2026-10-03T11:00:00",
      },
    ];
    expect(predictCategories(history, now, 14, "out")[0]).toBe("dining");
  });
});

describe("splits", () => {
  it("splits a total into two positive lines", () => {
    expect(splitLines(20, "dining", 5, "transportation")).toEqual([
      { amount: 15, category: "dining" },
      { amount: 5, category: "transportation" },
    ]);
    expect(splitLines(20, "dining", 20, "transportation")).toBeNull();
  });
});
