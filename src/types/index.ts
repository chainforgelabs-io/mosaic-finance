export type Tier = "free" | "essential" | "pro" | "premium";

export type PlanStatus = "none" | "generating" | "failed" | "pending_review" | "delivered";

export type RiskLabel =
  | "Conservative"
  | "Moderately Conservative"
  | "Balanced"
  | "Growth"
  | "Aggressive";

export interface UserProfile {
  id: string;
  alias: string;
  email?: string;
  province?: string;
  age?: number;
  employmentType?: string;
  familyStructure?: string;
  tier: Tier;
}

export interface FinancialCardData {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendDirection?: "up" | "down";
}

export interface ActionItem {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
}

export interface ETFRecommendation {
  ticker: string;
  name: string;
  mer: string;
  allocation: string;
  rationale: string;
}

export interface ComparisonRow {
  label: string;
  values: string[];
}

export interface ComparisonTable {
  title: string;
  headers: string[];
  rows: ComparisonRow[];
}

export interface CoverageRec {
  type: string;
  priority: string;
  rationale: string;
}

export interface PlanSection {
  id: string;
  title: string;
  subtitle?: string;
  status: "ai_generated" | "cim_reviewed";
  summary: string;
  cards: FinancialCardData[];
  prose: string;
  actionItems: ActionItem[];
  etfTable?: ETFRecommendation[];
  tables?: ComparisonTable[];
  coverageRecs?: CoverageRec[];
  disclaimer?: string;
}

export interface FinancialPlan {
  id: string;
  userId: string;
  status: PlanStatus;
  healthScore: number;
  riskLabel: RiskLabel;
  createdAt: string;
  deliveredAt?: string;
  estimatedDelivery?: string;
  sections: PlanSection[];
  netWorth: string;
  monthlyCashFlow: string;
  savingsRate: string;
  retirementGap: string;
}

export interface MarketContextReport {
  id: string;
  updatedAt: string;
  headline: string;
  macroSummary: string;
  rateSummary: string;
  portfolioRelevance: string;
  riskFactors: string[];
  indicators: { label: string; value: string; change: string; direction: "up" | "down" }[];
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface HouseholdMember {
  id?: string;
  relationship: "spouse" | "child" | "parent" | "sibling" | "other";
  age?: number;
  sex?: "male" | "female" | "other" | "prefer-not-to-say";
  occupation?: string;
  annualIncome?: number;
  isDependant: boolean;
  notes?: string;
}

export type OnboardingStep =
  | "profile"
  | "fact-find"
  | "risk-profile"
  | "holdings"
  | "generating"
  | "review"
  | "complete";

export type UserRole = "user" | "cim_reviewer";

export type ApprovalAction = "approve" | "edit_approve" | "reject";

export type QueuePriority = "priority" | "standard";

export type QueueFilter = "all" | "priority" | "standard" | "overdue";

export interface ReviewerProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ApprovalQueueItem {
  id: string;
  planId: string;
  userAlias: string;
  riskScore: number;
  riskLabel: RiskLabel;
  tier: Tier;
  province: string;
  age: number;
  submittedAt: string;
  slaDeadline: string;
  priority: QueuePriority;
  plan: FinancialPlan;
}

export interface ApprovalAudit {
  submittedBy: string;
  submittedAt: string;
  slaDeadline: string;
  reviewedBy?: string;
  reviewedAt?: string;
  action?: ApprovalAction;
}
