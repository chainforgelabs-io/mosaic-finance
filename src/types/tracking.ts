import type {
  GoalPriority,
  GoalStatus,
  GoalType,
} from "@/lib/tracking/categories";

export type TransactionSource = "manual" | "screenshot" | "scheduled" | "balance_check" | "catchup";

export type CashDirection = "in" | "out";
export type RecurringCadence = "weekly" | "biweekly" | "monthly";
export type StatementInstrument = "credit" | "debit";
export type StatementLineRole =
  | "purchase"
  | "income"
  | "card_payment"
  | "transfer"
  | "fee"
  | "interest";

export interface TransactionRow {
  id: string;
  user_id: string;
  txn_date: string;
  amount: number;
  category: string;
  description: string | null;
  note: string | null;
  source: TransactionSource;
  document_id: string | null;
  category_confirmed: boolean;
  direction?: CashDirection;
  line_role?: StatementLineRole;
  instrument?: StatementInstrument | null;
  recurring_item_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  direction: CashDirection;
  cadence: RecurringCadence;
  next_date: string;
  active: boolean;
}

export interface CashAnchor {
  starting_balance: number;
  anchor_date: string;
}

export interface SpendingPicture {
  income_monthly: number;
  needs_monthly: number;
  flexible_monthly: number;
  left_monthly: number;
  credit_growth_monthly: number;
  months_covered: number;
  partial: boolean;
  observation: string | null;
}

export interface CaptureInput {
  amount: number;
  category: string;
  direction: CashDirection;
  categoryConfirmed: boolean;
  txnDate: string;
  note?: string;
  description?: string;
  source?: "manual" | "catchup";
  lines?: { amount: number; category: string }[];
  recurring?: { name: string; cadence: RecurringCadence } | null;
}

export interface ParsedSpendingItem {
  txn_date: string | null;
  amount: number;
  description: string;
  suggested_category: string;
  note?: string;
  instrument?: StatementInstrument;
  line_role?: StatementLineRole;
}

export interface SnapshotBreakdownItem {
  id?: string;
  name?: string;
  account_type?: string;
  category?: string;
  type?: string;
  value: number;
}

export interface SnapshotBreakdown {
  investments: SnapshotBreakdownItem[];
  fixed_assets: SnapshotBreakdownItem[];
  debts: SnapshotBreakdownItem[];
}

export interface NetWorthSnapshotRow {
  id: string;
  user_id: string;
  snapshot_date: string;
  investments_total: number;
  fixed_assets_total: number;
  debts_total: number;
  net_worth: number;
  breakdown: SnapshotBreakdown;
  created_at: string;
  updated_at: string;
}

export type GoalSource = "onboarding" | "fact_find" | "manual";

export interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  goal_type: GoalType;
  target_amount: number | null;
  current_amount: number;
  target_date: string | null;
  target_age: number | null;
  amount_unknown: boolean;
  priority: GoalPriority;
  status: GoalStatus;
  source: GoalSource;
  created_at: string;
  updated_at: string;
}

export interface AchievementRow {
  id: string;
  user_id: string;
  achievement_key: string;
  achieved_at: string;
}

export interface GamificationSummary {
  weeklyStreak: number;
  monthlyStreak: number;
  loggedThisWeek: boolean;
  snapshottedThisMonth: boolean;
  achievements: {
    key: string;
    name: string;
    description: string;
    achieved_at: string;
  }[];
  newUnlocks: {
    key: string;
    name: string;
    description: string;
  }[];
}
