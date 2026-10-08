import { describe, expect, it } from "vitest";
import {
  effectiveBudget,
  entriesFromSuggestions,
  fillAcrossMonths,
  indexPlan,
  monthsOfYear,
  planFromHistory,
  planFromStatementLines,
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
