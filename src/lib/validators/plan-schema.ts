import { z } from 'zod';

const DebtRankingSchema = z.object({
  debt: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
  reason: z.string().min(1),
});

const ScoreBreakdownSchema = z.object({
  cash_flow: z.number().min(0).max(100),
  debt: z.number().min(0).max(100),
  savings: z.number().min(0).max(100),
  protection: z.number().min(0).max(100),
  planning: z.number().min(0).max(100),
});

const FinancialHealthDiagnosticSchema = z.object({
  net_worth: z.number(),
  net_worth_trend: z.string().min(1),
  cash_flow_monthly: z.number(),
  savings_rate_percent: z.number().min(0).max(100),
  emergency_fund_status: z.string().min(1),
  emergency_fund_months: z.number().min(0),
  debt_ranking: z.array(DebtRankingSchema),
  financial_health_score: z.number().min(1).max(100),
  score_breakdown: ScoreBreakdownSchema,
  key_findings: z.array(z.string().min(1)).min(1),
  action_items: z.array(z.string().min(1)).min(1),
});

const RetirementIncomeSourceSchema = z.object({
  source: z.string().min(1),
  estimated_monthly: z.number().min(0),
});

const RetirementReadinessSchema = z.object({
  retirement_number: z.number().min(0),
  current_trajectory: z.number(),
  monthly_savings_required: z.number().min(0),
  cpp_estimated_monthly: z.number().min(0),
  oas_estimated_monthly: z.number().min(0),
  rrsp_strategy: z.string().min(1),
  tfsa_strategy: z.string().min(1),
  fhsa_eligible: z.boolean(),
  fhsa_strategy: z.string().min(1),
  retirement_income_sources: z.array(RetirementIncomeSourceSchema).min(1),
  gap_analysis: z.string().min(1),
  key_assumptions: z.array(z.string().min(1)).min(1),
  action_items: z.array(z.string().min(1)).min(1),
});

const ETFRecommendationSchema = z.object({
  ticker: z.string().min(1).max(10),
  name: z.string().min(1),
  mer: z.number().min(0).max(5),
  allocation_percent: z.number().min(0).max(100),
  rationale: z.string().min(1),
  five_year_return_benchmark: z.string().optional(),
});

const InvestmentPortfolioBlueprintSchema = z.object({
  recommended_allocation: z.object({
    canadian_equity: z.number().min(0).max(100),
    us_equity: z.number().min(0).max(100),
    international_equity: z.number().min(0).max(100),
    fixed_income: z.number().min(0).max(100),
    alternatives: z.number().min(0).max(100),
  }),
  core_etf_recommendations: z.array(ETFRecommendationSchema).min(1),
  satellite_recommendations: z.array(ETFRecommendationSchema),
  rebalancing_schedule: z.string().min(1),
  account_location_strategy: z.string().min(1),
  current_portfolio_assessment: z.string().min(1),
  action_items: z.array(z.string().min(1)).min(1),
});

const TaxEfficiencyReviewSchema = z.object({
  rrsp_room_analysis: z.string().min(1),
  rrsp_contribution_recommendation: z.number().min(0),
  tfsa_room_analysis: z.string().min(1),
  tfsa_strategy: z.string().min(1),
  fhsa_analysis: z.string().min(1),
  tax_loss_harvesting_opportunities: z.string(),
  income_splitting_opportunities: z.string(),
  provincial_tax_considerations: z.string().min(1),
  estimated_annual_tax_savings: z.number().min(0),
  action_items: z.array(z.string().min(1)).min(1),
});

const DebtMethodSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
  total_interest_paid: z.number().min(0),
  payoff_months: z.number().min(0),
});

const DebtEliminationPlanSchema = z.object({
  total_debt: z.number().min(0),
  avalanche_method: DebtMethodSchema,
  snowball_method: DebtMethodSchema,
  recommended_method: z.string().min(1),
  recommendation_rationale: z.string().min(1),
  refinancing_analysis: z.string(),
  monthly_schedule_summary: z.string().min(1),
  action_items: z.array(z.string().min(1)).min(1),
});

const CoverageRecommendationSchema = z.object({
  type: z.string().min(1),
  priority: z.string().min(1),
  rationale: z.string().min(1),
});

const InsuranceCoverageAuditSchema = z.object({
  life_insurance_need: z.number().min(0),
  current_coverage: z.number().min(0),
  life_insurance_gap: z.number(),
  disability_insurance_analysis: z.string().min(1),
  critical_illness_analysis: z.string().min(1),
  coverage_recommendations: z.array(CoverageRecommendationSchema),
  action_items: z.array(z.string().min(1)).min(1),
});

const MarketContextReportSchema = z.object({
  macro_environment: z.string().min(1),
  relevant_sectors: z.array(z.string().min(1)),
  portfolio_specific_risks: z.string().min(1),
  portfolio_specific_opportunities: z.string().min(1),
  rate_environment_impact: z.string().min(1),
  canadian_market_context: z.string().min(1),
  disclaimer: z.string().min(1),
});

const NetWorthMilestoneSchema = z.object({
  age: z.number().min(18).max(120),
  target_net_worth: z.number(),
  key_actions: z.string().min(1),
});

const LifetimeFinancialRoadmapSchema = z.object({
  current_decade_priorities: z.array(z.string().min(1)).min(1),
  next_decade_priorities: z.array(z.string().min(1)).min(1),
  net_worth_milestones: z.array(NetWorthMilestoneSchema).min(1),
  financial_independence_number: z.number().min(0),
  financial_independence_target_age: z.number().min(18).max(120),
  decade_by_decade_summary: z.string().min(1),
  action_items: z.array(z.string().min(1)).min(1),
});

export const FinancialPlanSchema = z.object({
  financial_health_diagnostic: FinancialHealthDiagnosticSchema,
  retirement_readiness: RetirementReadinessSchema,
  investment_portfolio_blueprint: InvestmentPortfolioBlueprintSchema,
  tax_efficiency_review: TaxEfficiencyReviewSchema,
  debt_elimination_plan: DebtEliminationPlanSchema,
  insurance_coverage_audit: InsuranceCoverageAuditSchema,
  market_context_report: MarketContextReportSchema,
  lifetime_financial_roadmap: LifetimeFinancialRoadmapSchema,
});

export type FinancialPlan = z.infer<typeof FinancialPlanSchema>;

export const PLAN_SECTIONS = [
  'financial_health_diagnostic',
  'retirement_readiness',
  'investment_portfolio_blueprint',
  'tax_efficiency_review',
  'debt_elimination_plan',
  'insurance_coverage_audit',
  'market_context_report',
  'lifetime_financial_roadmap',
] as const;
