import type { FinancialPlan } from '@/lib/validators/plan-schema';

export const VALID_PLAN_DATA: FinancialPlan = {
  financial_health_diagnostic: {
    net_worth: 145000,
    net_worth_trend: 'Increasing — up 12% year-over-year driven by consistent TFSA contributions and debt reduction',
    cash_flow_monthly: 1850,
    savings_rate_percent: 22,
    emergency_fund_status: 'Adequate — 4.2 months of essential expenses covered',
    emergency_fund_months: 4.2,
    debt_ranking: [
      { debt: 'Credit card', priority: 'high', reason: '19.99% interest rate — highest cost debt' },
      { debt: 'Car loan', priority: 'medium', reason: '5.9% — moderate rate, secured' },
      { debt: 'Student loan', priority: 'low', reason: '3.5% — lowest rate, potential tax deduction on interest' },
    ],
    financial_health_score: 68,
    score_breakdown: { cash_flow: 75, debt: 55, savings: 70, protection: 45, planning: 80 },
    key_findings: [
      'Strong savings rate of 22% exceeds the recommended 20% benchmark',
      'Credit card debt at 19.99% is costing approximately $166/month in interest',
      'Emergency fund covers 4.2 months — target is 6 months for your family structure',
    ],
    action_items: [
      'Prioritize eliminating credit card balance within 8 months using the avalanche method',
      'Increase emergency fund from 4.2 to 6 months of expenses ($10,800 additional)',
      'Review insurance coverage — current gap identified in disability insurance',
    ],
  },
  retirement_readiness: {
    retirement_number: 1_850_000,
    current_trajectory: 1_420_000,
    monthly_savings_required: 1200,
    cpp_estimated_monthly: 1100,
    oas_estimated_monthly: 700,
    rrsp_strategy: 'Maximize RRSP contributions to $18,000/year to reduce taxable income from the 29% federal bracket to the 20.5% bracket, saving approximately $1,530 in federal tax annually',
    tfsa_strategy: 'Contribute $7,000 annually to TFSA — prioritize Canadian equity ETFs here for tax-free capital gains and eligible dividends',
    fhsa_eligible: true,
    fhsa_strategy: 'Open FHSA immediately and contribute the full $8,000 annual limit. With no previous home ownership, this provides a tax deduction now and tax-free withdrawal for your planned home purchase in 2028',
    retirement_income_sources: [
      { source: 'RRSP/RRIF drawdown', estimated_monthly: 3200 },
      { source: 'TFSA withdrawals', estimated_monthly: 1500 },
      { source: 'CPP', estimated_monthly: 1100 },
      { source: 'OAS', estimated_monthly: 700 },
    ],
    gap_analysis: 'Current trajectory of $1,420,000 falls $430,000 short of the $1,850,000 target. Increasing monthly retirement savings by $400 and achieving a 6% average return closes the gap by age 63.',
    key_assumptions: [
      'Average annual return of 6% (balanced portfolio)',
      'Inflation rate of 2.5%',
      'CPP claiming at age 65 (standard)',
      'OAS at full amount (15+ years of Canadian residence)',
    ],
    action_items: [
      'Increase monthly RRSP contributions from $800 to $1,200',
      'Open FHSA and contribute $8,000 for 2026 tax year',
      'Review CPP statement of contributions at age 55 to refine estimate',
    ],
  },
  investment_portfolio_blueprint: {
    recommended_allocation: {
      canadian_equity: 25,
      us_equity: 30,
      international_equity: 15,
      fixed_income: 25,
      alternatives: 5,
    },
    core_etf_recommendations: [
      { ticker: 'XEQT', name: 'iShares Core Equity ETF Portfolio', mer: 0.20, allocation_percent: 40, rationale: 'All-in-one global equity exposure at institutional-grade MER', five_year_return_benchmark: '9.8% annualized' },
      { ticker: 'ZAG', name: 'BMO Aggregate Bond Index ETF', mer: 0.09, allocation_percent: 20, rationale: 'Canadian investment-grade bonds for portfolio stability and income', five_year_return_benchmark: '1.2% annualized' },
      { ticker: 'VCN', name: 'Vanguard FTSE Canada All Cap Index ETF', mer: 0.05, allocation_percent: 15, rationale: 'Low-cost Canadian equity exposure with dividend tax credit eligibility in non-registered accounts', five_year_return_benchmark: '8.4% annualized' },
      { ticker: 'XBB', name: 'iShares Core Canadian Universe Bond Index ETF', mer: 0.10, allocation_percent: 5, rationale: 'Additional fixed income diversification', five_year_return_benchmark: '1.0% annualized' },
    ],
    satellite_recommendations: [
      { ticker: 'XRE', name: 'iShares S&P/TSX Capped REIT Index ETF', mer: 0.61, allocation_percent: 5, rationale: 'Real estate exposure as inflation hedge and income diversifier' },
    ],
    rebalancing_schedule: 'Semi-annual rebalancing (June and December) with 5% drift threshold trigger for interim rebalancing',
    account_location_strategy: 'Hold US-listed ETFs and fixed income in RRSP (withholding tax benefit); Canadian equities and growth in TFSA (tax-free gains); Canadian dividend stocks in non-registered (dividend tax credit)',
    current_portfolio_assessment: 'Current portfolio is 80% cash and 20% GICs — significantly underweight equities for a balanced risk profile with 25+ year time horizon. Recommend gradual deployment over 6 months via dollar-cost averaging.',
    action_items: [
      'Open self-directed RRSP and TFSA with a discount brokerage',
      'Deploy cash holdings into XEQT and ZAG using 6-month DCA schedule',
      'Set up automatic monthly contributions aligned to pay schedule',
    ],
  },
  tax_efficiency_review: {
    rrsp_room_analysis: 'Estimated RRSP room of $32,000 including $14,000 carry-forward. Current contributions use only 56% of annual limit.',
    rrsp_contribution_recommendation: 18000,
    tfsa_room_analysis: 'Estimated TFSA room of $23,000 including unused carry-forward from 2020-2023.',
    tfsa_strategy: 'Maximize annual $7,000 contribution; hold growth-oriented Canadian ETFs (VCN) for tax-free capital gains',
    fhsa_analysis: 'Eligible for FHSA as first-time home buyer. $8,000 annual contribution provides immediate tax deduction at marginal rate of 29%, saving $2,320 in federal tax. Plan for home purchase in 2028 means 2 years of contributions ($16,000) before withdrawal.',
    tax_loss_harvesting_opportunities: 'No current holdings to harvest — this strategy becomes relevant once the portfolio is deployed and market conditions create unrealized losses in non-registered accounts',
    income_splitting_opportunities: 'Spousal RRSP contribution available — consider contributing to spouse\'s RRSP if their income is lower, reducing combined tax burden at retirement',
    provincial_tax_considerations: 'Ontario surtax applies above $4,991 provincial tax. RRSP deductions reduce both federal and Ontario provincial tax. Ontario dividend tax credit rate is 10% for eligible dividends.',
    estimated_annual_tax_savings: 4850,
    action_items: [
      'Maximize RRSP contribution to $18,000 before March 2027 deadline',
      'Open FHSA and contribute $8,000 for immediate $2,320 tax savings',
      'Consider spousal RRSP if partner\'s income is in a lower bracket',
    ],
  },
  debt_elimination_plan: {
    total_debt: 28500,
    avalanche_method: {
      order: ['Credit card ($10,000 at 19.99%)', 'Car loan ($12,000 at 5.9%)', 'Student loan ($6,500 at 3.5%)'],
      total_interest_paid: 3240,
      payoff_months: 24,
    },
    snowball_method: {
      order: ['Student loan ($6,500)', 'Credit card ($10,000)', 'Car loan ($12,000)'],
      total_interest_paid: 3890,
      payoff_months: 26,
    },
    recommended_method: 'Avalanche',
    recommendation_rationale: 'Avalanche method saves $650 in interest and pays off 2 months faster. Your financial profile suggests strong discipline (22% savings rate), so the mathematical advantage outweighs the psychological wins of snowball.',
    refinancing_analysis: 'Credit card balance transfer to a 0% promotional rate card could save $850 in interest over 12 months. Student loan rate is already below prime — no refinancing benefit.',
    monthly_schedule_summary: 'Minimum payments on car loan and student loan ($550 combined). All extra cash flow ($500/month) directed to credit card until eliminated, then cascades to car loan.',
    action_items: [
      'Apply for 0% balance transfer card for credit card debt',
      'Set up automatic minimum payments on all three debts',
      'Direct $500/month extra payment to highest-rate debt',
    ],
  },
  insurance_coverage_audit: {
    life_insurance_need: 650000,
    current_coverage: 200000,
    life_insurance_gap: 450000,
    disability_insurance_analysis: 'No individual disability insurance. Employer provides short-term disability (60% of salary for 17 weeks) but no long-term coverage. This is a critical gap — income is the most valuable asset at this career stage.',
    critical_illness_analysis: 'No critical illness insurance. Given family history and age, a $100,000 CI policy is recommended as a financial bridge if diagnosed with a covered condition.',
    coverage_recommendations: [
      { type: 'Term life insurance (20-year)', priority: 'high', rationale: 'Close $450,000 gap to protect family income and mortgage obligations' },
      { type: 'Long-term disability insurance', priority: 'high', rationale: 'Replace 60-70% of income if unable to work beyond employer STD coverage' },
      { type: 'Critical illness insurance', priority: 'medium', rationale: 'Lump-sum benefit for covered conditions; consider $100,000 coverage' },
    ],
    action_items: [
      'Get quotes for 20-year term life insurance ($450,000 coverage)',
      'Apply for individual long-term disability insurance',
      'Review employer benefits package for any group CI options',
    ],
  },
  market_context_report: {
    macro_environment: 'The Bank of Canada has held the overnight rate at 3.25% following five consecutive cuts. Canadian GDP growth has moderated to 1.8% annualized. Inflation has returned to the 2-3% target band. The TSX Composite has gained 8.2% YTD, led by financials and energy sectors.',
    relevant_sectors: ['Canadian financials', 'Energy', 'Technology', 'Fixed income'],
    portfolio_specific_risks: 'Primary risk is the high cash allocation (80%) resulting in inflation erosion of purchasing power. Delayed equity deployment means missing current market momentum. Bond prices face headwinds if rate cuts pause.',
    portfolio_specific_opportunities: 'Favourable entry point for fixed income as rate cuts support bond prices. Canadian bank stocks trading at reasonable valuations with strong dividend yields. Dollar-cost averaging into equities reduces timing risk.',
    rate_environment_impact: 'Lower rates support equity valuations and bond prices but reduce GIC and savings account yields — reinforcing the need to deploy cash into a diversified portfolio.',
    canadian_market_context: 'TSX outperforming on relative value basis. Canadian dollar at 0.73 USD provides natural diversification benefit for US equity holdings. Housing market stabilizing following rate cuts.',
    disclaimer: 'This market commentary is educational context only. It is not a prediction of future performance and should not be used as the sole basis for investment decisions.',
  },
  lifetime_financial_roadmap: {
    current_decade_priorities: [
      'Eliminate all consumer debt within 24 months',
      'Build emergency fund to 6 months of expenses',
      'Open and maximize FHSA for home purchase',
      'Begin systematic investment program (RRSP + TFSA)',
    ],
    next_decade_priorities: [
      'Purchase first home using FHSA funds',
      'Maximize RRSP contributions annually',
      'Begin RESP for children if applicable',
      'Target net worth of $500,000 by age 45',
    ],
    net_worth_milestones: [
      { age: 35, target_net_worth: 200000, key_actions: 'Debt-free, FHSA maximized, emergency fund complete' },
      { age: 40, target_net_worth: 400000, key_actions: 'Home purchased, RRSP and TFSA on track' },
      { age: 50, target_net_worth: 800000, key_actions: 'Peak earning years, maximize all registered accounts' },
      { age: 60, target_net_worth: 1500000, key_actions: 'Pre-retirement planning, begin de-risking portfolio' },
      { age: 65, target_net_worth: 1850000, key_actions: 'Retirement ready, begin CPP/OAS claiming strategy' },
    ],
    financial_independence_number: 1850000,
    financial_independence_target_age: 63,
    decade_by_decade_summary: 'The next 5 years focus on debt elimination and building the investment foundation. Ages 35-45 are the wealth accumulation phase, leveraging compound growth in registered accounts. Ages 45-55 focus on maximizing peak-earning contributions. The final decade before retirement shifts to capital preservation and income planning.',
    action_items: [
      'Set up automated savings splits on pay day (RRSP, TFSA, FHSA, emergency fund)',
      'Schedule annual financial plan review each January',
      'Revisit risk profile every 5 years or after major life events',
    ],
  },
};

export const MINIMAL_VALID_PLAN: FinancialPlan = {
  ...VALID_PLAN_DATA,
};

export function createPlanWithOverrides(
  overrides: Partial<FinancialPlan>,
): unknown {
  return { ...VALID_PLAN_DATA, ...overrides };
}
