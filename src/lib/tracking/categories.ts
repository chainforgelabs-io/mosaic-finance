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
  other: "Other",
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
  if (/^[a-z0-9_]+$/.test(key)) {
    return humanizeKey(key);
  }
  return trimmed;
}

export function categoryLabel(category: string): string {
  if (isSpendingCategory(category)) return SPENDING_CATEGORY_LABELS[category];
  return humanizeKey(category);
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
