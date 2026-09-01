import type {
  GoalPriority,
  GoalStatus,
  GoalType,
  SpendingCategory,
} from "@/lib/tracking/categories";

export type TransactionSource = "manual" | "screenshot";

export interface TransactionRow {
  id: string;
  user_id: string;
  txn_date: string;
  amount: number;
  category: SpendingCategory;
  description: string | null;
  note: string | null;
  source: TransactionSource;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedSpendingItem {
  txn_date: string | null;
  amount: number;
  description: string;
  suggested_category: SpendingCategory;
  note?: string;
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
