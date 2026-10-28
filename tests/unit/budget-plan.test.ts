import { describe, expect, it } from "vitest";
import {
  effectiveBudget,
  budgetMeter,
  entriesFromSchedules,
  entriesFromSuggestions,
  fillAcrossMonths,
  indexPlan,
  ledgerFromRows,
  monthAmountsFromRow,
  paymentPreviewNote,
  monthsOfYear,
  scheduledMonthAmounts,
  planFromHistory,
  planFromStatementLines,
  planOverview,
  planTotals,
  plannedCategories,
  presetSuggestions,
  rowTotal,
} from "@/lib/tracking/budget-plan";
import {
  categoryKind,
  labelFor,
  resolveCategories,
  type UserCategory,
} from "@/lib/tracking/categories";
import type { BudgetPlanEntry } from "@/types/tracking";

const entries: BudgetPlanEntry[] = [
  { kind: "income", category: "paycheque", month: "2026-01-01", amount: 5000 },
  { kind: "income", category: "paycheque", month: "2026-02-01", amount: 5000 },
  { kind: "expense", category: "housing", month: "2026-01-01", amount: 1800 },
  { kind: "expense", category: "groceries", month: "2026-01-01", amount: 600 },
  { kind: "savings", category: "tfsa", month: "2026-01-01", amount: 500 },
];

describe("plan grid math", () => {
  it("lists twelve month starts for a year", () => {
    const months = monthsOfYear(2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-01-01");
    expect(months[11]).toBe("2026-12-01");
  });

  it("totals a month and reports what is left to allocate", () => {
    expect(planTotals(entries, "2026-01-01")).toEqual({
      income: 5000,
      expense: 2400,
      savings: 500,
      toBeAllocated: 2100,
    });
  });

  it("totals a whole year when no month is given", () => {
    expect(planTotals(entries).income).toBe(10000);
  });

  it("sums a row across months and lists planned categories in order", () => {
    const index = indexPlan(entries);
    expect(rowTotal(index, "income", "paycheque", monthsOfYear(2026))).toBe(10000);
    expect(plannedCategories(entries, "expense")).toEqual(["housing", "groceries"]);
  });

  it("counts biweekly payments per month from the last payment date", () => {
    const slots = scheduledMonthAmounts(863.47, "biweekly", "2026-01-02", 2026);
    const january = slots.find((slot) => slot.month === "2026-01-01");
    const february = slots.find((slot) => slot.month === "2026-02-01");
    const july = slots.find((slot) => slot.month === "2026-07-01");
    expect(january).toEqual({ month: "2026-01-01", count: 3, amount: 2590.41 });
    expect(february).toEqual({ month: "2026-02-01", count: 2, amount: 1726.94 });
    expect(july).toEqual({ month: "2026-07-01", count: 3, amount: 2590.41 });
    expect(slots.reduce((sum, slot) => sum + slot.count, 0)).toBe(26);
  });

  it("fills a value across the rest of the year", () => {
    const filled = fillAcrossMonths("expense", "groceries", "2026-10-01", 650, monthsOfYear(2026));
    expect(filled).toHaveLength(3);
    expect(filled[0]).toEqual({ kind: "expense", category: "groceries", month: "2026-10-01", amount: 650 });
    expect(filled[2].month).toBe("2026-12-01");
  });

  it("prefers a plan entry over the standing monthly limit", () => {
    const index = indexPlan(entries);
    const defaults = { groceries: 700, dining: 200 };
    expect(effectiveBudget(index, defaults, "groceries", "2026-01-15")).toBe(600);
    expect(effectiveBudget(index, defaults, "groceries", "2026-02-15")).toBe(700);
    expect(effectiveBudget(index, defaults, "dining", "2026-02-15")).toBe(200);
    expect(effectiveBudget(index, defaults, "travel", "2026-02-15")).toBeNull();
  });

  it("treats a blank plan cell as unset and uses the standing limit", () => {
    const index = indexPlan([
      ...entries,
      { kind: "expense", category: "dining", month: "2026-02-01", amount: 0 },
      { kind: "expense", category: "housing", month: "2026-02-01", amount: 0 },
    ]);
    const defaults = { dining: 200, housing: 0 };
    expect(effectiveBudget(index, defaults, "dining", "2026-02-15")).toBe(200);
    expect(effectiveBudget(index, defaults, "housing", "2026-02-15")).toBeNull();
  });

  it("shows spent against the budget, and treats a zero allocation as over", () => {
    expect(budgetMeter(155, 1220)).toMatchObject({ allocated: 1220, over: false, tone: "ok" });
    expect(budgetMeter(1400, 1220).over).toBe(true);
    expect(budgetMeter(1400, 1220).width).toBe(100);
    expect(budgetMeter(755, null)).toMatchObject({ allocated: 0, width: 100, over: true, tone: "red" });
    expect(budgetMeter(755, 0)).toMatchObject({ allocated: 0, width: 100, over: true, tone: "red" });
    expect(budgetMeter(0, null).over).toBe(false);
  });
});

describe("plan from statements", () => {
  const lines = [
    { txn_date: "2026-07-01", amount: 3000, description: "PAYROLL", suggested_category: "paycheque", line_role: "income", instrument: "debit" },
    { txn_date: "2026-08-01", amount: 3000, description: "PAYROLL", suggested_category: "paycheque", line_role: "income", instrument: "debit" },
    { txn_date: "2026-07-03", amount: 1500, description: "RENT", suggested_category: "housing", line_role: "purchase", instrument: "debit" },
    { txn_date: "2026-08-03", amount: 1500, description: "RENT", suggested_category: "housing", line_role: "purchase", instrument: "debit" },
    { txn_date: "2026-07-10", amount: 100, description: "RESTAURANT", suggested_category: "dining", line_role: "purchase", instrument: "credit" },
    { txn_date: "2026-08-10", amount: 300, description: "RESTAURANT", suggested_category: "dining", line_role: "purchase", instrument: "credit" },
    { txn_date: "2026-07-15", amount: 400, description: "PAYMENT THANK YOU", suggested_category: "debt_payments", line_role: "card_payment", instrument: "credit" },
    { txn_date: "2026-07-15", amount: 400, description: "VISA PAYMENT", suggested_category: "debt_payments", line_role: "card_payment", instrument: "debit" },
    { txn_date: "2026-07-20", amount: 50, description: "TRANSFER TO SAVINGS", suggested_category: "other", line_role: "transfer", instrument: "debit" },
  ] as const;

  it("averages each category over the months present and skips covered card payments", () => {
    const plan = planFromStatementLines([...lines], "2026-10-08");
    const byKey = Object.fromEntries(plan.map((row) => [`${row.kind}|${row.category}`, row.monthly]));
    expect(byKey["income|paycheque"]).toBe(3000);
    expect(byKey["expense|housing"]).toBe(1500);
    expect(byKey["expense|dining"]).toBe(200);
    expect(byKey["expense|debt_payments"]).toBeUndefined();
    expect(byKey["expense|other"]).toBeUndefined();
  });

  it("marks needs so the grid can group them", () => {
    const plan = planFromStatementLines([...lines], "2026-10-08");
    expect(plan.find((row) => row.category === "housing")?.isNeed).toBe(true);
    expect(plan.find((row) => row.category === "dining")?.isNeed).toBe(false);
  });

  it("expands suggestions into one entry per month", () => {
    const expanded = entriesFromSuggestions([{ kind: "expense", category: "housing", monthly: 1500, isNeed: true }], 2026);
    expect(expanded).toHaveLength(12);
    expect(expanded.every((entry) => entry.amount === 1500)).toBe(true);
  });
});

describe("plan from logged history", () => {
  it("averages the last full months and sorts lines by kind", () => {
    const txns = [
      { txn_date: "2026-08-01", amount: 4000, direction: "in", line_role: "income", category: "paycheque" },
      { txn_date: "2026-09-01", amount: 4000, direction: "in", line_role: "income", category: "paycheque" },
      { txn_date: "2026-08-05", amount: 100, direction: "out", category: "dining" },
      { txn_date: "2026-09-05", amount: 300, direction: "out", category: "dining" },
      { txn_date: "2026-09-06", amount: 500, direction: "out", line_role: "savings", category: "tfsa" },
      { txn_date: "2026-10-02", amount: 999, direction: "out", category: "shopping" },
    ];
    const plan = planFromHistory(txns, "2026-10-08");
    const byKey = Object.fromEntries(plan.map((row) => [`${row.kind}|${row.category}`, row.monthly]));
    expect(byKey["income|paycheque"]).toBe(4000);
    expect(byKey["expense|dining"]).toBe(200);
    expect(byKey["savings|tfsa"]).toBe(250);
    expect(byKey["expense|shopping"]).toBeUndefined();
  });

  it("offers an empty starter plan", () => {
    const preset = presetSuggestions();
    expect(preset.some((row) => row.kind === "income")).toBe(true);
    expect(preset.some((row) => row.kind === "savings")).toBe(true);
    expect(preset.every((row) => row.monthly === 0)).toBe(true);
  });
});

describe("category catalog", () => {
  const catalog: UserCategory[] = [
    { slug: "dining", label: "Eating out", kind: "expense", is_need: false, sort_order: 0, archived: false },
    { slug: "kids", label: "Kids", kind: "expense", is_need: false, sort_order: 0, archived: true },
    { slug: "dog", label: "Dog", kind: "expense", is_need: false, sort_order: 1, archived: false },
    { slug: "rental_income", label: "Rental income", kind: "income", is_need: false, sort_order: 0, archived: false },
  ];

  it("knows the built-in kind of a slug", () => {
    expect(categoryKind("paycheque")).toBe("income");
    expect(categoryKind("tfsa")).toBe("savings");
    expect(categoryKind("groceries")).toBe("expense");
    expect(categoryKind("dog")).toBe("expense");
  });

  it("merges built-ins with renames, archives, and custom rows", () => {
    const expenses = resolveCategories(catalog, "expense");
    const slugs = expenses.map((option) => option.slug);
    expect(slugs).not.toContain("kids");
    expect(slugs).toContain("dog");
    expect(expenses.find((option) => option.slug === "dining")?.label).toBe("Eating out");
    expect(expenses.find((option) => option.slug === "dog")?.custom).toBe(true);
    expect(resolveCategories(catalog, "income").map((option) => option.slug)).toContain("rental_income");
  });

  it("labels honour the catalog", () => {
    expect(labelFor(catalog, "dining")).toBe("Eating out");
    expect(labelFor(catalog, "groceries")).toBe("Groceries");
  });
});

describe("plan overview", () => {
  it("turns a year of plan rows into the cash-flow cards", () => {
    const overview = planOverview([
      { kind: "income", category: "pay", month: "2026-01-01", amount: 10000 },
      { kind: "income", category: "pay", month: "2026-02-01", amount: 10000 },
      { kind: "expense", category: "rent", month: "2026-01-01", amount: 2000 },
      { kind: "expense", category: "rent", month: "2026-02-01", amount: 2000 },
      { kind: "savings", category: "tfsa", month: "2026-01-01", amount: 500 },
      { kind: "savings", category: "tfsa", month: "2026-02-01", amount: 500 },
    ]);
    expect(overview).toEqual({ annualIncome: 20000, monthlyCashFlow: 1333.33, savingsRate: 5 });
  });

  it("stays empty when every plan cell is zero", () => {
    expect(planOverview([{ kind: "income", category: "pay", month: "2026-01-01", amount: 0 }])).toBeNull();
  });
});

describe("ledger rows", () => {
  it("counts biweekly payments from the last payment date instead of spreading an average", () => {
    const built = ledgerFromRows(
      [
        {
          kind: "expense",
          name: "Mortgage",
          amount: 863.47,
          cadence: "biweekly",
          basis: "each",
          nextDate: "2026-01-02",
        },
      ],
      2026,
    );
    const months = built.entries.filter((entry) => entry.category === "mortgage");
    expect(new Set(months.map((entry) => entry.amount)).size).toBeGreaterThan(1);
    expect(months.find((entry) => entry.month === "2026-01-01")?.amount).toBe(2590.41);
    expect(months.find((entry) => entry.month === "2026-02-01")?.amount).toBe(1726.94);
    expect(built.schedules[0]).toMatchObject({ amount: 863.47, cadence: "biweekly" });
    expect(built.planSchedules[0]).toMatchObject({
      cadence: "biweekly",
      amount: 863.47,
      anchor_date: "2026-01-02",
    });
  });

  it("fills a variable envelope the same every month", () => {
    const slots = monthAmountsFromRow(1400, null, "each", "2026-03-15", 2026);
    expect(slots).toHaveLength(12);
    expect(slots.every((slot) => slot.amount === 1400 && slot.count === 1)).toBe(true);
  });

  it("places one monthly payment in every month from the last payment date", () => {
    const fromJan = monthAmountsFromRow(2000, "monthly", "each", "2026-01-31", 2026);
    const fromNov = monthAmountsFromRow(2000, "monthly", "each", "2026-11-01", 2026);
    expect(fromJan.map((slot) => slot.amount)).toEqual(fromNov.map((slot) => slot.amount));
    expect(fromJan.every((slot) => slot.amount === 2000 && slot.count === 1)).toBe(true);
  });

  it("lands a quarterly payment four times, on the same day", () => {
    const slots = monthAmountsFromRow(120, "quarterly", "each", "2026-01-15", 2026);
    const filled = slots.filter((slot) => slot.amount > 0);
    expect(filled.map((slot) => slot.month)).toEqual(["2026-01-01", "2026-04-01", "2026-07-01", "2026-10-01"]);
    expect(filled.every((slot) => slot.amount === 120 && slot.count === 1)).toBe(true);
  });

  it("lands a payment every 4 months", () => {
    const slots = monthAmountsFromRow(80, "every4months", "each", "2026-01-15", 2026);
    const filled = slots.filter((slot) => slot.amount > 0);
    expect(filled.map((slot) => slot.month)).toEqual(["2026-01-01", "2026-05-01", "2026-09-01"]);
  });

  it("names the month a yearly payment lands instead of reading January", () => {
    const slots = monthAmountsFromRow(45.58, "yearly", "each", "2026-10-23", 2026);
    expect(paymentPreviewNote(slots)).toBe("October has 1 payment ($45.58).");
  });

  it("fills the next year from the saved dates, not by copying one year's cells", () => {
    const next = entriesFromSchedules(
      [
        {
          kind: "expense",
          category: "insurance",
          amount: 45.58,
          basis: "each",
          cadence: "yearly",
          anchor_date: "2026-10-23",
        },
      ],
      2027,
    );
    const filled = next.filter((entry) => entry.amount > 0);
    expect(filled).toEqual([
      { kind: "expense", category: "insurance", month: "2027-10-01", amount: 45.58 },
    ]);
  });

  it("puts a yearly payment in one month", () => {
    const slots = monthAmountsFromRow(590, "yearly", "each", "2025-09-15", 2026);
    const filled = slots.filter((slot) => slot.amount > 0);
    expect(filled).toHaveLength(1);
    expect(filled[0]).toMatchObject({ month: "2026-09-01", amount: 590, count: 1 });
  });

  it("keeps the per-pay amount for a yearly salary paid every 2 weeks", () => {
    const built = ledgerFromRows(
      [
        {
          kind: "income",
          name: "Salary",
          amount: 150000,
          cadence: "biweekly",
          basis: "year",
          nextDate: "2026-10-23",
        },
        {
          kind: "expense",
          name: "Rent",
          amount: 2000,
          cadence: "monthly",
          basis: "each",
          nextDate: "2026-11-01",
        },
      ],
      2026,
    );
    expect(built.schedules[0]).toMatchObject({
      amount: 5769.23,
      cadence: "biweekly",
      direction: "in",
      line_role: "income",
      category: "salary",
    });
    const salary = built.entries.filter((entry) => entry.category === "salary");
    expect(salary).toHaveLength(12);
    expect(new Set(salary.map((entry) => entry.amount)).size).toBeGreaterThan(1);
    expect(salary.some((entry) => entry.amount === 11538.46 || entry.amount === 17307.69)).toBe(true);
    expect(built.schedules[1]).toMatchObject({ amount: 2000, direction: "out", line_role: "purchase" });
    expect(built.planSchedules[1].anchor_date).toBe("2026-11-01");
  });
});
