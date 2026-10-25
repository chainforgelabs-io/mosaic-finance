import type {
  GoalPriority,
  GoalStatus,
  GoalType,
} from "@/lib/tracking/categories";

export type TransactionSource = "manual" | "screenshot" | "scheduled" | "balance_check" | "catchup";

export type CashDirection = "in" | "out";
export type RecurringCadence =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "quarterly"
  | "every4months"
  | "semiannual"
  | "yearly";
export type StatementInstrument = "credit" | "debit";
export type StatementLineRole =
  | "purchase"
  | "income"
  | "card_payment"
  | "transfer"
  | "fee"
  | "interest"
  | "savings";

/** What the keypad is logging: money out, money in, or money set aside. */
export type CaptureMode = "out" | "in" | "save";

export interface BudgetPlanEntry {
  kind: "income" | "expense" | "savings";
  category: string;
  /** First day of the month, YYYY-MM-01. */
  month: string;
  amount: number;
}

/** The inputs that fill a plan row. Null cadence is a flat monthly envelope. */
export interface BudgetPlanSchedule {
  kind: "income" | "expense" | "savings";
  category: string;
  amount: number;
  basis: "each" | "year";
  cadence: RecurringCadence | null;
  /** Last payment date. Null only for a flat monthly envelope (no cadence). */
  anchor_date: string | null;
  /** Spending category for an expense line. Null for income, savings, and lines not yet grouped. */
  spend_category?: string | null;
}

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
  /** One figure for credit cards and lines of credit. Null until the user enters it. */
  owed_balance?: number | null;
  /** Date that owed figure was last entered. */
  owed_as_of?: string | null;
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
  /** Set to "savings" when money is being set aside rather than spent. */
  lineRole?: StatementLineRole;
  /** "credit" when the purchase is on a card. "debit" when it leaves the bank. */
  instrument?: StatementInstrument | null;
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
  /** Liabilities only: credit limit, so available credit can be derived. */
  credit_limit?: number | null;
  /** Liabilities only: user override for short vs long-term. */
  term?: "short" | "long" | null;
}

export interface SnapshotBreakdown {
  investments: SnapshotBreakdownItem[];
  fixed_assets: SnapshotBreakdownItem[];
  debts: SnapshotBreakdownItem[];
  /** Derived totals, written from the snapshot route onward. Older rows lack them. */
  short_term_total?: number;
  long_term_total?: number;
  available_credit?: number;
  cash_total?: number;
  liquidity?: number;
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
  reviewed_at?: string | null;
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
