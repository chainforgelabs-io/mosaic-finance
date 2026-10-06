import { describe, expect, it } from "vitest";
import { cashEffect, countsTowardSpend, leftToSpend } from "@/lib/tracking/cash-capture";
import { normalizeStatementItems } from "@/lib/tracking/spending-parse";
import { baselineObservation, buildStatementBaseline } from "@/lib/tracking/statement-baseline";

describe("statement lines", () => {
  it("keeps income and card payments, and stamps the account type", () => {
    const items = normalizeStatementItems(
      [
        {
          txn_date: "2026-07-02",
          amount: 3200,
          description: "Payroll",
          line_role: "income",
          suggested_category: "paycheque",
        },
        {
          txn_date: "2026-07-03",
          amount: 400,
          description: "Payment thank you",
          line_role: "card_payment",
          suggested_category: "other",
        },
      ],
      "credit",
    );
    expect(items[0]).toMatchObject({ line_role: "income", suggested_category: "paycheque", instrument: "credit" });
    expect(items[1]).toMatchObject({ line_role: "card_payment", suggested_category: "debt_payments" });
    expect(
      normalizeStatementItems(
        [
          {
            txn_date: "2026-07-14",
            amount: 1314,
            description: "EI",
            line_role: "transfer",
            suggested_category: "other",
          },
        ],
        "debit",
      )[0],
    ).toMatchObject({ line_role: "income", suggested_category: "ei" });
    expect(
      normalizeStatementItems(
        [
          {
            txn_date: "2026-07-02",
            amount: 40,
            description: "Daycare",
            line_role: "purchase",
            suggested_category: "Child care",
          },
        ],
        "debit",
      )[0]?.suggested_category,
    ).toBe("child_care");
    expect(countsTowardSpend(items[1])).toBe(false);
    expect(cashEffect({ ...items[1], txn_date: "2026-07-03", direction: "out" })).toBe(-400);
    expect(
      cashEffect({
        txn_date: "2026-07-04",
        amount: 40,
        direction: "out",
        line_role: "purchase",
        instrument: "credit",
      }),
    ).toBe(0);
  });
});

describe("statement baseline", () => {
  const lines = [
    line("2026-07-01", 4000, "income", "paycheque", "debit", "Payroll"),
    line("2026-08-01", 4000, "income", "paycheque", "debit", "Payroll"),
    line("2026-09-01", 4000, "income", "paycheque", "debit", "Payroll"),
    line("2026-07-02", 2000, "purchase", "housing", "debit", "Rent"),
    line("2026-08-02", 2000, "purchase", "housing", "debit", "Rent"),
    line("2026-09-02", 2000, "purchase", "housing", "debit", "Rent"),
    line("2026-07-04", 100, "purchase", "dining", "debit", "Cafe"),
    line("2026-08-04", 100, "purchase", "dining", "debit", "Cafe"),
    line("2026-09-04", 100, "purchase", "dining", "debit", "Cafe"),
    line("2026-07-06", 200, "purchase", "dining", "credit", "Dinner"),
    line("2026-08-06", 200, "purchase", "dining", "credit", "Dinner"),
    line("2026-07-07", 50, "card_payment", "debt_payments", "credit", "Payment thank you"),
    line("2026-07-08", 50, "card_payment", "debt_payments", "debit", "Visa payment"),
    line("2026-10-02", 9000, "purchase", "shopping", "debit", "This month"),
  ];

  it("averages complete months and keeps card payments out of spending", () => {
    const baseline = buildStatementBaseline(lines, "2026-10-06");
    expect(baseline).not.toBeNull();
    expect(baseline?.months).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(baseline?.partial).toBe(false);
    expect(baseline?.incomeMonthly).toBe(4000);
    expect(baseline?.needsMonthly).toBe(2000);
    expect(baseline?.flexibleMonthly).toBe(233.33);
    expect(baseline?.leftMonthly).toBe(1766.67);
    expect(baseline?.creditGrowthMonthly).toBe(175);
    expect(baseline?.coverageNote).toBe("Based on July, August, and September.");
    expect(baseline?.hasCredit).toBe(true);
    expect(baseline?.hasDebit).toBe(true);
    expect(baseline?.repeats.map((item) => item.name)).toEqual(expect.arrayContaining(["Payroll", "Rent"]));
    expect(baseline?.observation).toContain("balance still grew");
    expect(baseline?.observation?.toLowerCase()).not.toContain("recommend");
  });

  it("keeps one month of pay whole when other months are only a credit card", () => {
    const baseline = buildStatementBaseline(
      [
        line("2026-07-02", 3799.05, "income", "paycheque", "debit", "Payroll dep."),
        line("2026-07-14", 1314, "income", "ei", "debit", "EI"),
        line("2026-07-16", 3799.05, "income", "paycheque", "debit", "Payroll dep."),
        line("2026-07-28", 1314, "income", "ei", "debit", "EI"),
        line("2026-07-30", 3799.05, "income", "paycheque", "debit", "Payroll dep."),
        line("2026-06-22", 40, "purchase", "dining", "credit", "Cafe"),
        line("2026-06-28", 20, "purchase", "dining", "credit", "Cafe"),
        line("2026-08-01", 90, "purchase", "shopping", "credit", "Store"),
        line("2026-08-20", 90, "purchase", "shopping", "credit", "Store"),
        line("2026-09-01", 60, "purchase", "shopping", "credit", "Store"),
        line("2026-09-18", 60, "purchase", "shopping", "credit", "Store"),
        line("2026-07-11", 800, "card_payment", "debt_payments", "debit", "MBNA payment"),
      ],
      "2026-10-06",
    );
    expect(baseline?.incomeMonthly).toBe(14025.15);
    expect(baseline?.months).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(baseline?.needsMonthly).toBe(266.67);
    expect(baseline?.coverageNote).toBe("Money in is from July. Spending is from July, August, and September.");
  });

  it("uses the current month when nothing earlier was uploaded", () => {
    const baseline = buildStatementBaseline(
      [line("2026-10-03", 80, "purchase", "groceries", "debit", "Market")],
      "2026-10-06",
    );
    expect(baseline?.partial).toBe(true);
    expect(baseline?.needsMonthly).toBe(80);
    expect(baseline?.leftMonthly).toBe(-80);
    expect(baseline?.observation).toContain("ahead of money in");
  });

  it("describes spending that ran ahead without telling someone what to cut", () => {
    const text = baselineObservation({
      leftMonthly: -200,
      flexibleMonthly: 500,
      flexibleByCategory: [{ category: "dining", monthly: 300 }],
      creditGrowthMonthly: 0,
    });
    expect(text).toContain("ahead of money in");
    expect(text).toContain("Dining");
    expect(text?.toLowerCase()).not.toMatch(/should|recommend|cut|reduce/);
  });
});

describe("left to spend from a statement picture", () => {
  it("subtracts new flexible spending from typical money in after needs", () => {
    const result = leftToSpend({
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      txns: [
        { txn_date: "2026-10-02", amount: 40, direction: "out", category: "dining", source: "manual" },
        { txn_date: "2026-10-02", amount: 2000, direction: "out", category: "housing", source: "screenshot" },
        { txn_date: "2026-10-03", amount: 20, direction: "out", category: "groceries", source: "manual" },
      ],
      recurring: [],
      monthlyRoom: null,
      period: "month",
      statementBaseline: { incomeMonthly: 4000, needsMonthly: 2500 },
    });
    expect(result.usesStatement).toBe(true);
    expect(result.left).toBe(1460);
  });
});

function line(
  txn_date: string,
  amount: number,
  line_role: "purchase" | "income" | "card_payment",
  suggested_category: string,
  instrument: "credit" | "debit",
  description: string,
) {
  return { txn_date, amount, line_role, suggested_category, instrument, description };
}
