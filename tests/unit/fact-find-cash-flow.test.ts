import { describe, expect, it } from "vitest";
import { FACT_FIND_SYSTEM_PROMPT } from "@/lib/claude/prompts/fact-find";
import { INCOME_CATEGORIES, SAVINGS_CATEGORIES, SPENDING_CATEGORIES } from "@/lib/tracking/categories";
import {
  linesNotAlreadyPlanned,
  normalizeCashFlowLines,
  resolveFactFindCashFlow,
} from "@/lib/tracking/fact-find-cash-flow";

describe("resolveFactFindCashFlow", () => {
  it("maps named lines and parks the unnamed spending and savings in the remainder", () => {
    const picture = resolveFactFindCashFlow({
      monthly_expenses: 4000,
      monthly_savings: 800,
      cash_flow_lines: [
        { kind: "expense", category: "housing", label: "Rent", monthly_amount: 2200 },
        { kind: "expense", category: "groceries", label: "Groceries", monthly_amount: 600 },
        { kind: "savings", category: "tfsa", label: "TFSA", monthly_amount: 500 },
        { kind: "income", category: "paycheque", label: "Paycheque", monthly_amount: 5200 },
      ],
      debts: [{ type: "Credit card", balance: 2000, monthly_payment: 150 }],
    });

    const housing = picture.lines.find((line) => line.category === "housing");
    const flex = picture.lines.find((line) => line.category === "other");
    const tfsa = picture.lines.find((line) => line.category === "tfsa");
    const otherSavings = picture.lines.find((line) => line.category === "other_savings");
    const debt = picture.lines.find((line) => line.category === "debt_payments");

    expect(housing?.monthly_amount).toBe(2200);
    expect(flex?.monthly_amount).toBe(1200);
    expect(tfsa?.monthly_amount).toBe(500);
    expect(otherSavings?.monthly_amount).toBe(300);
    expect(debt?.monthly_amount).toBe(150);
    expect(picture.monthly_expenses).toBe(4000);
    expect(picture.monthly_savings).toBe(800);
  });

  it("does not fold debt payments into the spending total", () => {
    const picture = resolveFactFindCashFlow({
      monthly_expenses: 3000,
      cash_flow_lines: [
        { kind: "expense", category: "housing", monthly_amount: 2000 },
        { kind: "expense", category: "debt_payments", monthly_amount: 900 },
      ],
    });
    expect(picture.monthly_expenses).toBe(3000);
    expect(picture.lines.find((line) => line.category === "other")?.monthly_amount).toBe(1000);
  });

  it("builds a single flex line from a lump when no categories were named", () => {
    const picture = resolveFactFindCashFlow({
      monthly_expenses: 3500,
      monthly_savings: 400,
    });
    expect(picture.lines.map((line) => line.category)).toEqual(["other", "other_savings"]);
    expect(picture.monthly_expenses).toBe(3500);
    expect(picture.monthly_savings).toBe(400);
  });

  it("trusts a confirmed card and does not refill deleted lines", () => {
    const picture = resolveFactFindCashFlow(
      {
        monthly_expenses: 4000,
        monthly_savings: 800,
        debts: [{ type: "Line of credit", balance: 5000, monthly_payment: 200 }],
        cash_flow_lines: [{ kind: "expense", category: "housing", label: "Rent", monthly_amount: 1800 }],
      },
      { trustLines: true },
    );
    expect(picture.lines).toEqual([
      { kind: "expense", category: "housing", label: "Rent", monthly_amount: 1800 },
    ]);
    expect(picture.monthly_expenses).toBe(1800);
  });

  it("sums duplicate categories and drops blank amounts", () => {
    const lines = normalizeCashFlowLines([
      { kind: "expense", category: "dining", label: "Dining out", monthly_amount: 80 },
      { kind: "expense", category: "dining", monthly_amount: 40 },
      { kind: "income", category: "paycheque", monthly_amount: 0 },
      { kind: "nope", category: "housing", monthly_amount: 10 },
    ]);
    expect(lines).toEqual([
      { kind: "expense", category: "dining", label: "Dining out", monthly_amount: 120 },
    ]);
  });

  it("leaves categories that are already on the plan", () => {
    const lines = resolveFactFindCashFlow({
      cash_flow_lines: [
        { kind: "expense", category: "housing", monthly_amount: 2000 },
        { kind: "expense", category: "groceries", monthly_amount: 500 },
      ],
    }).lines;
    expect(linesNotAlreadyPlanned(lines, ["expense|housing"]).map((line) => line.category)).toEqual([
      "groceries",
    ]);
  });
});

describe("fact-find cash flow prompt", () => {
  it("asks both modes for monthly spending and a category breakdown", () => {
    expect(FACT_FIND_SYSTEM_PROMPT).toContain("monthly spending");
    expect(FACT_FIND_SYSTEM_PROMPT).toContain("cash_flow_lines");
    expect(FACT_FIND_SYSTEM_PROMPT).toContain("Do not interview every category");
    expect(FACT_FIND_SYSTEM_PROMPT).toContain("until the lines are close");
    expect(FACT_FIND_SYSTEM_PROMPT).toContain("Do not invent a line");
    expect(FACT_FIND_SYSTEM_PROMPT).toContain("debt_payments");
    for (const slug of [...SPENDING_CATEGORIES, ...INCOME_CATEGORIES, ...SAVINGS_CATEGORIES]) {
      expect(FACT_FIND_SYSTEM_PROMPT).toContain(slug);
    }
  });
});
