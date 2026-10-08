export const SPENDING_CATEGORIES = [
  "housing",
  "groceries",
  "dining",
  "transportation",
  "utilities",
  "subscriptions",
  "insurance",
  "health",
  "entertainment",
  "shopping",
  "travel",
  "kids",
  "gifts_donations",
  "debt_payments",
  "condo_fees",
  "other",
] as const;

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];

/** Categories shown on the capture pad. The rest stay behind More. */
export const KEYPAD_CATEGORIES = [
  "groceries",
  "dining",
  "transportation",
  "shopping",
  "entertainment",
  "health",
  "kids",
  "housing",
  "subscriptions",
  "other",
] as const;

export const SPENDING_CATEGORY_LABELS: Record<SpendingCategory, string> = {
  housing: "Housing",
  groceries: "Groceries",
  dining: "Dining",
  transportation: "Transportation",
  utilities: "Utilities",
  subscriptions: "Subscriptions",
  insurance: "Insurance",
  health: "Health",
  entertainment: "Entertainment",
  shopping: "Shopping",
  travel: "Travel",
  kids: "Kids",
  gifts_donations: "Gifts & Donations",
  debt_payments: "Debt Payments",
  condo_fees: "Condo fees",
  other: "Flex/Misc",
};

export const SPENDING_CATEGORY_COLORS: Record<SpendingCategory, string> = {
  housing: "#6366f1",
  groceries: "#10b981",
  dining: "#f59e0b",
  transportation: "#3b82f6",
  utilities: "#8b5cf6",
  subscriptions: "#ec4899",
  insurance: "#64748b",
  health: "#ef4444",
  entertainment: "#14b8a6",
  shopping: "#f97316",
  travel: "#06b6d4",
  kids: "#a855f7",
  gifts_donations: "#84cc16",
  debt_payments: "#e11d48",
  condo_fees: "#0f766e",
  other: "#9ca3af",
};

/** Money in. Labels describe where pay comes from, nothing more. */
export const INCOME_CATEGORIES = [
  "paycheque",
  "paycheque_2",
  "side_income",
  "benefits",
  "other_income",
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  paycheque: "Paycheque",
  paycheque_2: "Paycheque 2",
  side_income: "Side income",
  benefits: "Benefits",
  other_income: "Other income",
};

/** Money set aside. Account labels only; the user decides what goes where. */
export const SAVINGS_CATEGORIES = [
  "tfsa",
  "rrsp",
  "fhsa",
  "resp",
  "cash_savings",
  "emergency_fund",
  "debt_principal",
  "other_savings",
] as const;

export type SavingsCategory = (typeof SAVINGS_CATEGORIES)[number];

export const SAVINGS_CATEGORY_LABELS: Record<SavingsCategory, string> = {
  tfsa: "TFSA",
  rrsp: "RRSP",
  fhsa: "FHSA",
  resp: "RESP",
  cash_savings: "Cash savings",
  emergency_fund: "Emergency fund",
  debt_principal: "Extra debt principal",
  other_savings: "Other savings",
};

export type CategoryKind = "income" | "expense" | "savings";

export const CATEGORY_KINDS: CategoryKind[] = ["income", "expense", "savings"];

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  income: "Income",
  expense: "Expenses",
  savings: "Savings",
};

/** Built-in kind for a slug. Custom slugs default to expense unless the catalog says otherwise. */
export function categoryKind(category: string): CategoryKind {
  if ((INCOME_CATEGORIES as readonly string[]).includes(category) || category === "income") return "income";
  if ((SAVINGS_CATEGORIES as readonly string[]).includes(category)) return "savings";
  return "expense";
}

export function defaultCategoriesForKind(kind: CategoryKind): readonly string[] {
  if (kind === "income") return INCOME_CATEGORIES;
  if (kind === "savings") return SAVINGS_CATEGORIES;
  return SPENDING_CATEGORIES;
}

export const GOAL_TYPES = [
  "emergency_fund",
  "debt_payoff",
  "home_purchase",
  "retirement",
  "education",
  "vacation",
  "vehicle",
  "wedding",
  "savings",
  "other",
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  emergency_fund: "Emergency fund",
  debt_payoff: "Pay off debt",
  home_purchase: "Home purchase",
  retirement: "Retirement",
  education: "Education",
  vacation: "Vacation",
  vehicle: "Vehicle",
  wedding: "Wedding",
  savings: "Build savings",
  other: "Other",
};

export const GOAL_PRIORITIES = ["high", "medium", "low"] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

export const GOAL_STATUSES = ["active", "achieved", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

const GOAL_TYPE_ALIASES: Record<string, GoalType> = {
  emergency: "emergency_fund",
  "emergency fund": "emergency_fund",
  emergency_fund: "emergency_fund",
  debt: "debt_payoff",
  "pay off debt": "debt_payoff",
  "debt paydown": "debt_payoff",
  "debt payoff": "debt_payoff",
  paydown: "debt_payoff",
  payoff: "debt_payoff",
  debt_payoff: "debt_payoff",
  house: "home_purchase",
  home: "home_purchase",
  "home purchase": "home_purchase",
  mortgage: "home_purchase",
  home_purchase: "home_purchase",
  retire: "retirement",
  retirement: "retirement",
  school: "education",
  education: "education",
  save_for_education: "education",
  education_savings: "education",
  college: "education",
  university: "education",
  travel: "vacation",
  vacation: "vacation",
  holiday: "vacation",
  car: "vehicle",
  vehicle: "vehicle",
  wedding: "wedding",
  savings: "savings",
  save: "savings",
};

export function inferGoalType(raw: string | null | undefined): GoalType {
  if (!raw) return "other";
  const trimmed = raw.trim().toLowerCase();
  const key = trimmed.replace(/\s+/g, "_");
  if ((GOAL_TYPES as readonly string[]).includes(key)) return key as GoalType;
  return GOAL_TYPE_ALIASES[key] ?? GOAL_TYPE_ALIASES[trimmed] ?? "other";
}

function humanizeKey(raw: string): string {
  return raw
    .split("_")
    .filter(Boolean)
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

/** Turn a stored goal key such as save_for_education into words. Known types use their label. */
export function presentGoalName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase().replace(/\s+/g, "_");
  if ((GOAL_TYPES as readonly string[]).includes(key)) {
    return GOAL_TYPE_LABELS[key as GoalType];
  }
  if (/^[a-z0-9_]+$/.test(trimmed)) {
    return humanizeKey(trimmed);
  }
  return trimmed;
}

const EXTRA_CATEGORY_LABELS: Record<string, string> = {
  income: "Income",
  untracked: "Untracked",
  ...INCOME_CATEGORY_LABELS,
  ...SAVINGS_CATEGORY_LABELS,
};

export function categoryLabel(category: string): string {
  if (isSpendingCategory(category)) return SPENDING_CATEGORY_LABELS[category];
  if (EXTRA_CATEGORY_LABELS[category]) return EXTRA_CATEGORY_LABELS[category];
  return humanizeKey(category);
}

/** A user's catalog row. Built-in slugs may be renamed or archived; new slugs are custom. */
export interface UserCategory {
  slug: string;
  label: string;
  kind: CategoryKind;
  is_need: boolean;
  sort_order: number;
  archived: boolean;
}

export interface CategoryOption {
  slug: string;
  label: string;
  kind: CategoryKind;
  isNeed: boolean;
  custom: boolean;
}

/** Built-ins merged with the user's catalog, archived rows removed, in display order. */
export function resolveCategories(catalog: UserCategory[], kind: CategoryKind): CategoryOption[] {
  const bySlug = new Map(catalog.map((row) => [row.slug, row]));
  const seen = new Set<string>();
  const options: CategoryOption[] = [];
  for (const slug of defaultCategoriesForKind(kind)) {
    const row = bySlug.get(slug);
    if (row?.archived) continue;
    seen.add(slug);
    options.push({
      slug,
      label: row?.label ?? categoryLabel(slug),
      kind,
      isNeed: row?.is_need ?? false,
      custom: false,
    });
  }
  const custom = catalog
    .filter((row) => row.kind === kind && !row.archived && !seen.has(row.slug))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
  for (const row of custom) {
    options.push({ slug: row.slug, label: row.label, kind, isNeed: row.is_need, custom: true });
  }
  return options;
}

/** Label lookup that honours renames in the user's catalog. */
export function labelFor(catalog: UserCategory[], category: string): string {
  const row = catalog.find((entry) => entry.slug === category);
  return row?.label ?? categoryLabel(category);
}

/** Kind lookup that honours the user's catalog, then built-ins. */
export function kindFor(catalog: UserCategory[], category: string): CategoryKind {
  const row = catalog.find((entry) => entry.slug === category);
  return row?.kind ?? categoryKind(category);
}

export function categorySlug(label: string): string | null {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(slug)) return null;
  return slug;
}

export function categoryColor(category: string): string {
  if (isSpendingCategory(category)) return SPENDING_CATEGORY_COLORS[category];
  return "#64748b";
}

export function isSpendingCategory(value: string): value is SpendingCategory {
  return (SPENDING_CATEGORIES as readonly string[]).includes(value);
}
