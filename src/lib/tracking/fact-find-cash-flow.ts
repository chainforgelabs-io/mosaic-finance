import {
  categoryLabel,
  categorySlug,
  defaultCategoriesForKind,
  INCOME_CATEGORIES,
  SAVINGS_CATEGORIES,
  SPENDING_CATEGORIES,
  type CategoryKind,
} from "@/lib/tracking/categories";

export interface CashFlowLine {
  kind: CategoryKind;
  category: string;
  label: string;
  monthly_amount: number;
}

export interface FactFindCashPicture {
  lines: CashFlowLine[];
  /** Spending total. Excludes debt payments, matching the Health Score. */
  monthly_expenses: number | null;
  monthly_savings: number | null;
}

const KINDS: CategoryKind[] = ["income", "expense", "savings"];
const REMAINDER: Record<CategoryKind, string> = {
  income: "other_income",
  expense: "other",
  savings: "other_savings",
};

export const CASH_FLOW_CATEGORY_GUIDE = [
  `Expense categories (use these slugs): ${SPENDING_CATEGORIES.join(", ")}.`,
  `Income categories (use these slugs): ${INCOME_CATEGORIES.join(", ")}.`,
  `Savings categories (use these slugs): ${SAVINGS_CATEGORIES.join(", ")}.`,
  "When they name something that is not in those lists, use a short snake_case slug and put their words in label.",
].join(" ");

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function slugFor(category: unknown, label: unknown): string | null {
  const explicit = String(category ?? "").trim().toLowerCase();
  if (/^[a-z][a-z0-9_]{0,39}$/.test(explicit)) return explicit;
  return categorySlug(String(label ?? category ?? ""));
}

/** Merge model rows into tracker lines. Drops blanks. Sums the same category. */
export function normalizeCashFlowLines(raw: unknown): CashFlowLine[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, CashFlowLine>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const kind = record.kind;
    if (kind !== "income" && kind !== "expense" && kind !== "savings") continue;
    const amount = asNumber(record.monthly_amount ?? record.amount);
    if (amount == null || amount <= 0) continue;
    const slug = slugFor(record.category, record.label ?? record.name);
    if (!slug) continue;
    const labelRaw = String(record.label ?? record.name ?? "").trim();
    const label = (labelRaw || categoryLabel(slug)).slice(0, 60);
    const key = `${kind}|${slug}`;
    const existing = merged.get(key);
    if (existing) {
      existing.monthly_amount = roundMoney(existing.monthly_amount + amount);
      if (labelRaw) existing.label = label;
    } else {
      merged.set(key, { kind, category: slug, label, monthly_amount: roundMoney(amount) });
    }
  }
  return KINDS.flatMap((kind) => [...merged.values()].filter((line) => line.kind === kind));
}

function sumKind(lines: CashFlowLine[], kind: CategoryKind, exclude: string[] = []): number {
  return roundMoney(
    lines
      .filter((line) => line.kind === kind && !exclude.includes(line.category))
      .reduce((sum, line) => sum + line.monthly_amount, 0),
  );
}

function addRemainder(lines: CashFlowLine[], kind: CategoryKind, stated: number | null): CashFlowLine[] {
  if (stated == null || stated <= 0) return lines;
  const lined = sumKind(lines, kind, kind === "expense" ? ["debt_payments"] : []);
  const gap = roundMoney(stated - lined);
  if (gap <= 0) return lines;
  const slug = REMAINDER[kind];
  const next = lines.map((line) => ({ ...line }));
  const existing = next.find((line) => line.kind === kind && line.category === slug);
  if (existing) existing.monthly_amount = roundMoney(existing.monthly_amount + gap);
  else next.push({ kind, category: slug, label: categoryLabel(slug), monthly_amount: gap });
  return next;
}

function debtPaymentTotal(debts: unknown): number {
  if (!Array.isArray(debts)) return 0;
  return roundMoney(
    debts.reduce((sum, row) => {
      if (!row || typeof row !== "object") return sum;
      const payment = asNumber((row as Record<string, unknown>).monthly_payment);
      return payment != null && payment > 0 ? sum + payment : sum;
    }, 0),
  );
}

/**
 * Lines Charlie extracted, filled out so the totals match what the person said.
 * When `trustLines` is set, the array is the confirmed card and is not rebuilt.
 */
export function resolveFactFindCashFlow(
  summary: Record<string, unknown>,
  options?: { trustLines?: boolean },
): FactFindCashPicture {
  let lines = normalizeCashFlowLines(summary.cash_flow_lines);
  if (!options?.trustLines) {
    const expenses = asNumber(summary.monthly_expenses);
    const savings = asNumber(summary.monthly_savings);
    lines = addRemainder(lines, "expense", expenses);
    lines = addRemainder(lines, "savings", savings);
    const debtPay = debtPaymentTotal(summary.debts);
    const hasDebtLine = lines.some((line) => line.kind === "expense" && line.category === "debt_payments");
    if (!hasDebtLine && debtPay > 0) {
      lines.push({
        kind: "expense",
        category: "debt_payments",
        label: categoryLabel("debt_payments"),
        monthly_amount: debtPay,
      });
    }
  }

  const expenseLines = lines.filter((line) => line.kind === "expense" && line.category !== "debt_payments");
  const savingsLines = lines.filter((line) => line.kind === "savings");
  const statedExpenses = asNumber(summary.monthly_expenses);
  const statedSavings = asNumber(summary.monthly_savings);

  return {
    lines,
    monthly_expenses: expenseLines.length > 0 ? sumKind(lines, "expense", ["debt_payments"]) : statedExpenses,
    monthly_savings: savingsLines.length > 0 ? sumKind(lines, "savings") : statedSavings,
  };
}

export function isBuiltInCategory(kind: CategoryKind, slug: string): boolean {
  return (defaultCategoriesForKind(kind) as readonly string[]).includes(slug);
}

/** Categories the catalog does not already know. */
export function customCashFlowCategories(lines: CashFlowLine[]): CashFlowLine[] {
  return lines.filter((line) => line.monthly_amount > 0 && !isBuiltInCategory(line.kind, line.category));
}

export function linesNotAlreadyPlanned(lines: CashFlowLine[], taken: Iterable<string>): CashFlowLine[] {
  const have = new Set(taken);
  return lines.filter((line) => line.monthly_amount > 0 && !have.has(`${line.kind}|${line.category}`));
}
