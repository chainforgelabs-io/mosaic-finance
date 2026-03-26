import { buildKnowledgeContext, type UserProfileFlags } from '@/lib/knowledge/loader';

export interface PlanGenerationInput {
  profile: {
    annual_income?: number | null;
    monthly_expenses?: number | null;
    monthly_savings?: number | null;
    emergency_fund_months?: number | null;
    major_debts?: { type: string; balance: number; rate: number; monthly_payment: number }[] | null;
    financial_goals?: { type: string; target_amount: number; target_date: string; priority: string }[] | null;
    retirement_target_age?: number | null;
  } | null;
  userProfile: {
    alias?: string | null;
    age?: number | null;
    province?: string | null;
    employment_type?: string | null;
    family_structure?: string | null;
  } | null;
  holdings: {
    account_type: string;
    holdings: { ticker: string; name: string; balance: number; units?: number }[];
    total_value?: number | null;
  }[] | null;
  riskProfile: {
    risk_score: string;
    conversational_insights?: string | null;
  } | null;
  factFindData?: unknown;
  householdMembers?: { relationship: string; age?: number; occupation?: string; annual_income?: number; is_dependant?: boolean }[] | null;
  marketContext: unknown;
  generatedAt: string;
  userFlags?: UserProfileFlags;
}

export function buildPlanGenerationPrompt(userData: PlanGenerationInput): string {
  const knowledgeContext = buildKnowledgeContext('plan-generation', userData.userFlags ?? {});

  return `You are a CIM-designated senior financial planner producing a comprehensive financial plan for a Canadian client. This plan will be reviewed by a CIM-designated professional before delivery.
${knowledgeContext}
CLIENT DATA:
${JSON.stringify(userData)}

Generate a complete 8-section financial plan. For each section, provide detailed, personalized analysis. Do NOT use generic guidance. Everything must reference the client's specific numbers, province, account types, and goals. Frame all output as educational planning considerations — not prescriptive advice.

OUTPUT FORMAT: Return a valid JSON object with this exact structure:

{
  "financial_health_diagnostic": {
    "net_worth": number,
    "net_worth_trend": string,
    "cash_flow_monthly": number,
    "savings_rate_percent": number,
    "emergency_fund_status": string,
    "emergency_fund_months": number,
    "debt_ranking": [{ "debt": string, "priority": "high|medium|low", "reason": string }],
    "financial_health_score": number,
    "score_breakdown": { "cash_flow": number, "debt": number, "savings": number, "protection": number, "planning": number },
    "key_findings": [string],
    "action_items": [string]
  },
  "retirement_readiness": {
    "retirement_number": number,
    "current_trajectory": number,
    "monthly_savings_required": number,
    "cpp_estimated_monthly": number,
    "oas_estimated_monthly": number,
    "rrsp_strategy": string,
    "tfsa_strategy": string,
    "fhsa_eligible": boolean,
    "fhsa_strategy": string,
    "retirement_income_sources": [{ "source": string, "estimated_monthly": number }],
    "gap_analysis": string,
    "key_assumptions": [string],
    "action_items": [string]
  },
  "investment_portfolio_blueprint": {
    "recommended_allocation": { "canadian_equity": number, "us_equity": number, "international_equity": number, "fixed_income": number, "alternatives": number },
    "core_etf_recommendations": [{ "ticker": string, "name": string, "mer": number, "allocation_percent": number, "rationale": string, "five_year_return_benchmark": string }],
    "satellite_recommendations": [{ "ticker": string, "name": string, "mer": number, "allocation_percent": number, "rationale": string }],
    "rebalancing_schedule": string,
    "account_location_strategy": string,
    "current_portfolio_assessment": string,
    "action_items": [string]
  },
  "tax_efficiency_review": {
    "rrsp_room_analysis": string,
    "rrsp_contribution_recommendation": number,
    "tfsa_room_analysis": string,
    "tfsa_strategy": string,
    "fhsa_analysis": string,
    "tax_loss_harvesting_opportunities": string,
    "income_splitting_opportunities": string,
    "provincial_tax_considerations": string,
    "estimated_annual_tax_savings": number,
    "action_items": [string]
  },
  "debt_elimination_plan": {
    "total_debt": number,
    "avalanche_method": { "order": [string], "total_interest_paid": number, "payoff_months": number },
    "snowball_method": { "order": [string], "total_interest_paid": number, "payoff_months": number },
    "recommended_method": string,
    "recommendation_rationale": string,
    "refinancing_analysis": string,
    "monthly_schedule_summary": string,
    "action_items": [string]
  },
  "insurance_coverage_audit": {
    "life_insurance_need": number,
    "current_coverage": number,
    "life_insurance_gap": number,
    "disability_insurance_analysis": string,
    "critical_illness_analysis": string,
    "coverage_recommendations": [{ "type": string, "priority": string, "rationale": string }],
    "action_items": [string]
  },
  "market_context_report": {
    "macro_environment": string,
    "relevant_sectors": [string],
    "portfolio_specific_risks": string,
    "portfolio_specific_opportunities": string,
    "rate_environment_impact": string,
    "canadian_market_context": string,
    "disclaimer": "This market commentary is educational context only. It is not a prediction of future performance and should not be used as the sole basis for investment decisions."
  },
  "lifetime_financial_roadmap": {
    "current_decade_priorities": [string],
    "next_decade_priorities": [string],
    "net_worth_milestones": [{ "age": number, "target_net_worth": number, "key_actions": string }],
    "financial_independence_number": number,
    "financial_independence_target_age": number,
    "decade_by_decade_summary": string,
    "action_items": [string]
  }
}

CRITICAL RULES:
- Be concise: keep narrative strings to 2-3 sentences, action items to one sentence each, and avoid restating data the client already knows
- Every number must be calculated from the client's actual data
- ETF recommendations must be real Canadian-listed ETFs (XEQT, VEQT, ZAG, XBB, etc.)
- MER values must be accurate to the best of your knowledge
- Tax analysis must be province-specific
- Retirement projections must include CPP and OAS estimates
- All considerations must be suitability-appropriate for the client's risk profile
- Flag any areas of uncertainty with explicit disclaimers within that section
- Any value you cannot calculate with confidence must be flagged with "[REQUIRES ADVISOR VERIFICATION]" rather than fabricating a number
- This output will be reviewed by a CIM professional before delivery — write as if a peer is reviewing your work
- Return ONLY the JSON object — no markdown fences, no commentary before or after`;
}
