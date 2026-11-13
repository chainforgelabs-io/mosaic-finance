/**
 * User-owned tables included in the JSON download.
 * financial_plans is queried separately so only the report columns are returned.
 * Uploaded file bytes are not included; the privacy page says to email for those.
 */
export const EXPORT_TABLES = [
  "financial_profiles",
  "household_members",
  "goals",
  "transactions",
  "recurring_items",
  "category_budgets",
  "user_categories",
  "budget_plan_entries",
  "budget_plan_schedules",
  "balance_checks",
  "cash_anchors",
  "spending_baselines",
  "net_worth_snapshots",
  "investment_holdings",
  "fixed_assets",
  "risk_profiles",
  "health_score_history",
  "user_achievements",
  "document_uploads",
  "conversation_sessions",
  "conversation_messages",
] as const;
