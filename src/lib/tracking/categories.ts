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
  const key = raw.trim().toLowerCase();
  if ((GOAL_TYPES as readonly string[]).includes(key)) return key as GoalType;
  return GOAL_TYPE_ALIASES[key] ?? "other";
}

export function isSpendingCategory(value: string): value is SpendingCategory {
  return (SPENDING_CATEGORIES as readonly string[]).includes(value);
}
