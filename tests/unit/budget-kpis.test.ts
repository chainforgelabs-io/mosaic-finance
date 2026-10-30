import { describe, expect, it } from "vitest";
import {
  categoryVariance,
  expenseCategoryVariance,
  ledgerHeaderKpis,
  ledgerOpening,
  ledgerRows,
  monthPeriod,
  monthlySeries,
  periodCompletion,
  savingsRate,
  trackedTotals,
  trackingBalance,
  UNGROUPED_SPEND,
  varianceSections,
  yearPeriod,
  kindMeter,
  monthBudgetPicture,
  monthCoverage,
  firstFullMonth,
  completeMonthBalance,
} from "@/lib/tracking/budget-kpis";
import type { BudgetPlanEntry } from "@/types/tracking";

const txns = [
  { txn_date: "2026-03-01", amount: 5197, direction: "in", line_role: "income", category: "paycheque" },
  { txn_date: "2026-03-15", amount: 4012, direction: "in", line_role: "income", category: "paycheque_2" },
  { txn_date: "2026-03-03", amount: 1269, direction: "out", line_role: "purchase", category: "housing" },
  { txn_date: "2026-03-08", amount: 2114, direction: "out", line_role: "purchase", category: "groceries" },
  { txn_date: "2026-03-10", amount: 476, direction: "out", line_role: "purchase", category: "dining" },
  { txn_date: "2026-03-12", amount: 1000, direction: "out", line_role: "savings", category: "tfsa" },
  { txn_date: "2026-03-20", amount: 400, direction: "out", line_role: "card_payment", category: "debt_payments" },
  { txn_date: "2026-04-02", amount: 50, direction: "out", line_role: "purchase", category: "dining" },
];

const plan: BudgetPlanEntry[] = [
  { kind: "income", category: "paycheque", month: "2026-03-01", amount: 5200 },
  { kind: "income", category: "paycheque_2", month: "2026-03-01", amount: 2200 },
  { kind: "expense", category: "housing", month: "2026-03-01", amount: 1269 },
  { kind: "expense", category: "groceries", month: "2026-03-01", amount: 1000 },
  { kind: "expense", category: "dining", month: "2026-03-01", amount: 200 },
  { kind: "expense", category: "utilities", month: "2026-03-01", amount: 704 },
  { kind: "savings", category: "tfsa", month: "2026-03-01", amount: 1000 },
];

describe("periods", () => {
  it("reports how much of a month has elapsed", () => {
    const march = monthPeriod("2026-03-01");
    expect(periodCompletion(march, "2026-04-10")).toBe(1);
    expect(periodCompletion(march, "2026-02-10")).toBe(0);
    expect(periodCompletion(march, "2026-03-31")).toBe(1);
    expect(periodCompletion(march, "2026-03-16")).toBeCloseTo(16 / 31, 5);
  });

  it("builds a year period with twelve months", () => {
    const year = yearPeriod(2026);
    expect(year.start).toBe("2026-01-01");
    expect(year.end).toBe("2026-12-31");
    expect(year.months).toHaveLength(12);
  });
});

describe("tracked totals and rates", () => {
  const march = monthPeriod("2026-03-01");
  const totals = trackedTotals(txns, march);

  it("sums income, expenses, and savings and ignores card payments", () => {
    expect(totals).toEqual({ income: 9209, expense: 3859, savings: 1000 });
  });

  it("reports the tracking balance", () => {
    expect(trackingBalance(totals)).toBe(4350);
  });

  it("computes active and passive savings rates", () => {
    expect(savingsRate(totals, "active")).toBeCloseTo(1000 / 9209, 3);
    expect(savingsRate(totals, "passive")).toBeCloseTo((9209 - 3859) / 9209, 3);
    expect(savingsRate({ income: 0, expense: 10, savings: 0 }, "active")).toBeNull();
  });
});

describe("variance", () => {
  it("splits a row into remaining and excess", () => {
    const over = categoryVariance("expense", "groceries", 2114, 1000);
    expect(over.pctComplete).toBeCloseTo(2.114, 3);
    expect(over.remaining).toBe(0);
    expect(over.excess).toBe(1114);

    const under = categoryVariance("expense", "utilities", 618, 704);
    expect(under.remaining).toBe(86);
    expect(under.excess).toBe(0);

    const unplanned = categoryVariance("expense", "other", 1480, null);
    expect(unplanned.budget).toBeNull();
    expect(unplanned.pctComplete).toBeNull();
  });

  it("groups rows by kind with totals, including planned-but-unused rows", () => {
    const sections = varianceSections(txns, plan, monthPeriod("2026-03-01"));
    const expenses = sections.find((section) => section.kind === "expense");
    expect(expenses?.rows.map((row) => row.category)).toEqual(["groceries", "housing", "dining", "utilities"]);
    expect(expenses?.totals.tracked).toBe(3859);
    expect(expenses?.totals.budget).toBe(3173);
    expect(expenses?.totals.excess).toBe(686);

    const income = sections.find((section) => section.kind === "income");
    expect(income?.totals.tracked).toBe(9209);
    expect(income?.totals.budget).toBe(7400);

    const savings = sections.find((section) => section.kind === "savings");
    expect(savings?.rows[0]).toMatchObject({ category: "tfsa", tracked: 1000, budget: 1000, remaining: 0, excess: 0 });
  });

  it("counts a generic paycheque against the one salary line on the plan", () => {
    const salaryPlan: BudgetPlanEntry[] = [
      { kind: "income", category: "Salary (Net)", month: "2026-03-01", amount: 7608 },
      { kind: "income", category: "EI", month: "2026-03-01", amount: 2628 },
    ];
    const pay = [{ txn_date: "2026-03-15", amount: 7827, direction: "in" as const, line_role: "income" as const, category: "paycheque" }];
    const income = varianceSections(pay, salaryPlan, monthPeriod("2026-03-01")).find((section) => section.kind === "income");
    expect(income?.rows.find((row) => row.category === "Salary (Net)")).toMatchObject({ tracked: 7827, budget: 7608 });
    expect(income?.rows.find((row) => row.category === "paycheque")).toBeUndefined();
    expect(income?.rows.find((row) => row.category === "EI")).toMatchObject({ tracked: 0, budget: 2628 });
  });

  it("falls back to standing category budgets when the plan has nothing for a month", () => {
    const sections = varianceSections(txns, [], monthPeriod("2026-03-01"), { dining: 300 });
    const dining = sections.find((section) => section.kind === "expense")?.rows.find((row) => row.category === "dining");
    expect(dining?.budget).toBe(300);
    expect(dining?.excess).toBe(176);
  });

  it("sums a full year of plan when the period is a year", () => {
    const yearPlan: BudgetPlanEntry[] = Array.from({ length: 12 }, (_, i) => ({
      kind: "expense",
      category: "dining",
      month: `2026-${String(i + 1).padStart(2, "0")}-01`,
      amount: 200,
    }));
    const sections = varianceSections(txns, yearPlan, yearPeriod(2026));
    const dining = sections.find((section) => section.kind === "expense")?.rows.find((row) => row.category === "dining");
    expect(dining?.budget).toBe(2400);
    expect(dining?.tracked).toBe(526);
  });
});

describe("monthly series", () => {
  it("returns twelve points with tracked and planned totals", () => {
    const series = monthlySeries(txns, plan, 2026);
    expect(series).toHaveLength(12);
    const march = series[2];
    expect(march.label).toBe("Mar");
    expect(march.income).toBe(9209);
    expect(march.expense).toBe(3859);
    expect(march.savings).toBe(1000);
    expect(march.plannedExpense).toBe(3173);
    expect(series[0].plannedExpense).toBeNull();
    expect(series[3].expense).toBe(50);
  });
});

describe("ledger", () => {
  it("orders lines oldest first with a running balance", () => {
    const rows = ledgerRows(txns.filter((txn) => txn.txn_date.startsWith("2026-03")));
    expect(rows[0].txn.txn_date).toBe("2026-03-01");
    expect(rows[0].effect).toBe(5197);
    expect(rows[0].balance).toBe(5197);
    expect(rows[1].balance).toBe(5197 - 1269);
    expect(rows[rows.length - 1].balance).toBe(5197 - 1269 - 2114 - 476 - 1000 + 4012 - 400);
    expect(rows.find((row) => row.txn.line_role === "savings")?.kind).toBe("savings");
  });

  it("starts the running balance from an opening amount", () => {
    const rows = ledgerRows(
      txns.filter((txn) => txn.txn_date.startsWith("2026-03") && txn.line_role === "income").slice(0, 1),
      2500,
    );
    expect(rows[0].balance).toBe(2500 + 5197);
  });

  it("orders the same day by when the line was logged", () => {
    const rows = ledgerRows([
      { txn_date: "2026-10-28", amount: 10, direction: "in", line_role: "income", created_at: "2026-10-28T15:00:00Z", id: "b" },
      { txn_date: "2026-10-28", amount: 5, direction: "in", line_role: "income", created_at: "2026-10-28T12:00:00Z", id: "a" },
    ]);
    expect(rows.map((row) => row.txn.id)).toEqual(["a", "b"]);
    expect(rows[1].balance).toBe(15);
  });

  it("leaves the bank balance blank until the day it was entered", () => {
    const rows = ledgerRows(
      [
        { txn_date: "2026-10-22", amount: 100, direction: "out", line_role: "purchase", id: "before" },
        { txn_date: "2026-10-23", amount: 50, direction: "out", line_role: "purchase", id: "on" },
        { txn_date: "2026-10-28", amount: 20, direction: "in", line_role: "income", id: "after" },
      ],
      1000,
      "2026-10-23",
    );
    expect(rows.find((row) => row.txn.id === "before")?.balance).toBeNull();
    expect(rows.find((row) => row.txn.id === "on")?.balance).toBe(1000);
    expect(rows.find((row) => row.txn.id === "after")?.balance).toBe(1020);
  });

  it("rolls a cash anchor forward as the year's opening", () => {
    const prior = [
      { txn_date: "2025-11-02", amount: 200, direction: "out" as const, line_role: "purchase" },
      { txn_date: "2025-12-20", amount: 500, direction: "in" as const, line_role: "income" },
    ];
    expect(
      ledgerOpening(2026, prior, { starting_balance: 1000, anchor_date: "2025-10-31" }),
    ).toBe(1300);
  });

  it("sums prior-year cash effects when there is no pre-year anchor", () => {
    const prior = [
      { txn_date: "2025-06-01", amount: 400, direction: "in" as const, line_role: "income" },
      { txn_date: "2025-08-01", amount: 50, direction: "out" as const, line_role: "purchase" },
      { txn_date: "2026-01-02", amount: 10, direction: "out" as const, line_role: "purchase" },
    ];
    expect(ledgerOpening(2026, prior, { starting_balance: 9000, anchor_date: "2026-01-15" })).toBe(9000);
    expect(ledgerOpening(2026, prior, null)).toBe(350);
  });

  it("summarises the header tiles", () => {
    const kpis = ledgerHeaderKpis(txns, "2026-04-10");
    expect(kpis.lastRecord).toBe("2026-04-02");
    expect(kpis.daysSinceLastRecord).toBe(8);
    expect(kpis.recordsThisYear).toBe(8);
    expect(kpis.trackingBalanceYtd).toBe(9209 - 3859 - 1000 - 50);
    expect(kpis.trackedSince).toBe("2026-03-01");
    expect(kpis.completeMonths).toBe(1);
    expect(kpis.completeMonthBalance).toBe(9209 - 3859 - 1000);
    expect(kpis.daysTrackedThisMonth).toBe(10);
    expect(kpis.daysInThisMonth).toBe(30);
  });

  it("treats a mid-month start as partial until the next month closes", () => {
    expect(monthCoverage("2026-10-01", "2026-10-23", "2026-10-29")).toBe("partial");
    expect(monthCoverage("2026-09-01", "2026-10-23", "2026-10-29")).toBe("untracked");
    expect(monthCoverage("2026-11-01", "2026-10-23", "2026-12-01")).toBe("complete");
    expect(firstFullMonth("2026-10-23")).toBe("2026-11-01");
    expect(firstFullMonth("2026-10-01")).toBe("2026-10-01");
    expect(completeMonthBalance(txns, 2026, "2026-10-23", "2026-10-29")).toEqual({ months: 0, balance: null });
  });
});

describe("expense category KPIs", () => {
  it("rolls named plan lines into a spending category and keeps unplanned spending", () => {
    const plan: BudgetPlanEntry[] = [
      { kind: "expense", category: "sgi_auto", month: "2026-03-01", amount: 45 },
      { kind: "expense", category: "home_insurance", month: "2026-03-01", amount: 80 },
      { kind: "expense", category: "mystery", month: "2026-03-01", amount: 20 },
    ];
    const section = expenseCategoryVariance(
      [
        { txn_date: "2026-03-04", amount: 30, direction: "out", line_role: "purchase", category: "insurance" },
        { txn_date: "2026-03-06", amount: 12, direction: "out", line_role: "purchase", category: "other" },
      ],
      plan,
      [
        { kind: "expense", category: "sgi_auto", spend_category: "insurance" },
        { kind: "expense", category: "home_insurance", spend_category: "insurance" },
      ],
      monthPeriod("2026-03-01"),
    );
    const insurance = section.rows.find((row) => row.category === "insurance");
    const other = section.rows.find((row) => row.category === "other");
    const ungrouped = section.rows.find((row) => row.category === UNGROUPED_SPEND);
    expect(insurance).toMatchObject({ tracked: 30, budget: 125 });
    expect(other).toMatchObject({ tracked: 12, budget: null });
    expect(ungrouped).toMatchObject({ tracked: 0, budget: 20 });
  });
});

describe("month budget picture", () => {
  const plan: BudgetPlanEntry[] = [
    { kind: "income", category: "paycheque", month: "2026-10-01", amount: 4000 },
    { kind: "expense", category: "residence_mortgage", month: "2026-10-01", amount: 1727 },
    { kind: "expense", category: "groceries", month: "2026-10-01", amount: 1400 },
    { kind: "savings", category: "tfsa", month: "2026-10-01", amount: 500 },
  ];
  const schedules = [{ kind: "expense", category: "residence_mortgage", spend_category: "housing" }];
  const txns = [
    { txn_date: "2026-10-15", amount: 5000, direction: "in", line_role: "income", category: "paycheque" },
    { txn_date: "2026-10-01", amount: 863, direction: "out", line_role: "purchase", category: "residence_mortgage" },
    { txn_date: "2026-10-04", amount: 1960, direction: "out", line_role: "purchase", category: "groceries" },
    { txn_date: "2026-10-06", amount: 37, direction: "out", line_role: "purchase", category: "dining" },
    { txn_date: "2026-10-08", amount: 100, direction: "out", line_role: "savings", category: "tfsa" },
  ];

  it("rolls bills into the spending category and keeps an unallocated spend on its own", () => {
    const picture = monthBudgetPicture(txns, plan, schedules, "2026-10-01");
    const housing = picture.spending.find((row) => row.category === "housing");
    const groceries = picture.spending.find((row) => row.category === "groceries");
    const dining = picture.spending.find((row) => row.category === "dining");
    expect(housing).toMatchObject({ tracked: 863, allocated: 1727, over: false });
    expect(housing?.lines[0]).toMatchObject({ category: "residence_mortgage", tracked: 863, allocated: 1727 });
    expect(groceries).toMatchObject({ tracked: 1960, allocated: 1400, over: true, lines: [] });
    expect(dining).toMatchObject({ tracked: 37, allocated: 0, over: true });
  });

  it("keeps extra income calm and marks savings that are short of the plan", () => {
    const picture = monthBudgetPicture(txns, plan, schedules, "2026-10-01");
    expect(picture.income).toMatchObject({ tracked: 5000, allocated: 4000, tone: "ok", width: 100 });
    expect(picture.income.lines.find((line) => line.category === "paycheque")).toMatchObject({ tracked: 5000, allocated: 4000 });
    expect(picture.expense.lines.find((line) => line.category === "residence_mortgage")).toMatchObject({
      tracked: 863,
      allocated: 1727,
    });
    expect(picture.expense.lines.find((line) => line.category === "dining")).toMatchObject({ tracked: 37, allocated: 0 });
    expect(picture.savings).toMatchObject({ tracked: 100, allocated: 500, tone: "amber" });
    expect(picture.savings.lines[0]).toMatchObject({ category: "tfsa", tracked: 100, allocated: 500 });
    expect(kindMeter("income", 5000, 4000).tone).toBe("ok");
    expect(kindMeter("expense", 37, 0).tone).toBe("red");
  });
});
