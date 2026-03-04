import { describe, it, expect } from 'vitest';
import { FinancialPlanSchema, PLAN_SECTIONS } from '@/lib/validators/plan-schema';
import { VALID_PLAN_DATA } from '../fixtures/plan-data';
import { isValidCanadianETF, VALID_CANADIAN_ETFS } from '../fixtures/canadian-etfs';

/**
 * Prompt quality tests validate that AI-generated plan data meets
 * structural and content requirements. These tests run against known
 * fixture data and can also be used to validate real Claude outputs
 * by replacing VALID_PLAN_DATA with actual generated plans.
 */

describe('8-Section Completeness', () => {
  it('plan contains exactly 8 sections', () => {
    const sectionKeys = Object.keys(VALID_PLAN_DATA);
    expect(sectionKeys).toHaveLength(8);
  });

  it.each(PLAN_SECTIONS)('section "%s" is present and non-empty', (section) => {
    expect(VALID_PLAN_DATA).toHaveProperty(section);
    const sectionData = VALID_PLAN_DATA[section];
    expect(sectionData).toBeDefined();
    expect(Object.keys(sectionData).length).toBeGreaterThan(0);
  });

  it('financial_health_diagnostic has all required fields', () => {
    const section = VALID_PLAN_DATA.financial_health_diagnostic;
    expect(section).toHaveProperty('net_worth');
    expect(section).toHaveProperty('cash_flow_monthly');
    expect(section).toHaveProperty('savings_rate_percent');
    expect(section).toHaveProperty('financial_health_score');
    expect(section).toHaveProperty('score_breakdown');
    expect(section).toHaveProperty('key_findings');
    expect(section).toHaveProperty('action_items');
  });

  it('retirement_readiness includes Canadian-specific fields', () => {
    const section = VALID_PLAN_DATA.retirement_readiness;
    expect(section).toHaveProperty('cpp_estimated_monthly');
    expect(section).toHaveProperty('oas_estimated_monthly');
    expect(section).toHaveProperty('rrsp_strategy');
    expect(section).toHaveProperty('tfsa_strategy');
    expect(section).toHaveProperty('fhsa_eligible');
    expect(section).toHaveProperty('fhsa_strategy');
  });

  it('investment_portfolio_blueprint includes ETF recommendations', () => {
    const section = VALID_PLAN_DATA.investment_portfolio_blueprint;
    expect(section.core_etf_recommendations.length).toBeGreaterThan(0);
    expect(section.recommended_allocation).toBeDefined();
    expect(section.account_location_strategy).toBeTruthy();
  });

  it('tax_efficiency_review is province-specific', () => {
    const section = VALID_PLAN_DATA.tax_efficiency_review;
    expect(section.provincial_tax_considerations).toBeTruthy();
    expect(section.provincial_tax_considerations.length).toBeGreaterThan(10);
  });

  it('debt_elimination_plan includes both methods', () => {
    const section = VALID_PLAN_DATA.debt_elimination_plan;
    expect(section.avalanche_method).toBeDefined();
    expect(section.snowball_method).toBeDefined();
    expect(section.recommended_method).toBeTruthy();
  });

  it('market_context_report includes mandatory disclaimer', () => {
    const section = VALID_PLAN_DATA.market_context_report;
    expect(section.disclaimer).toBeTruthy();
    expect(section.disclaimer.toLowerCase()).toContain('educational');
    expect(section.disclaimer.toLowerCase()).toContain('not');
  });

  it('lifetime_financial_roadmap includes milestones', () => {
    const section = VALID_PLAN_DATA.lifetime_financial_roadmap;
    expect(section.net_worth_milestones.length).toBeGreaterThan(0);
    expect(section.financial_independence_number).toBeGreaterThan(0);
    expect(section.financial_independence_target_age).toBeGreaterThan(0);
  });

  it('every section with action_items has at least one', () => {
    const sectionsWithActions = [
      'financial_health_diagnostic',
      'retirement_readiness',
      'investment_portfolio_blueprint',
      'tax_efficiency_review',
      'debt_elimination_plan',
      'insurance_coverage_audit',
      'lifetime_financial_roadmap',
    ] as const;

    for (const section of sectionsWithActions) {
      const data = VALID_PLAN_DATA[section];
      expect(data.action_items.length, `${section} should have action items`).toBeGreaterThan(0);
    }
  });
});

describe('ETF Ticker Validation', () => {
  it('all core ETF recommendations use valid Canadian-listed tickers', () => {
    const etfs = VALID_PLAN_DATA.investment_portfolio_blueprint.core_etf_recommendations;
    for (const etf of etfs) {
      expect(
        isValidCanadianETF(etf.ticker),
        `${etf.ticker} should be a valid Canadian-listed ETF`,
      ).toBe(true);
    }
  });

  it('all satellite ETF recommendations use valid Canadian-listed tickers', () => {
    const etfs = VALID_PLAN_DATA.investment_portfolio_blueprint.satellite_recommendations;
    for (const etf of etfs) {
      expect(
        isValidCanadianETF(etf.ticker),
        `${etf.ticker} should be a valid Canadian-listed ETF`,
      ).toBe(true);
    }
  });

  it('ETF tickers are uppercase', () => {
    const allETFs = [
      ...VALID_PLAN_DATA.investment_portfolio_blueprint.core_etf_recommendations,
      ...VALID_PLAN_DATA.investment_portfolio_blueprint.satellite_recommendations,
    ];
    for (const etf of allETFs) {
      expect(etf.ticker).toBe(etf.ticker.toUpperCase());
    }
  });

  it('ETF names are non-empty strings', () => {
    const allETFs = [
      ...VALID_PLAN_DATA.investment_portfolio_blueprint.core_etf_recommendations,
      ...VALID_PLAN_DATA.investment_portfolio_blueprint.satellite_recommendations,
    ];
    for (const etf of allETFs) {
      expect(etf.name.length).toBeGreaterThan(0);
    }
  });

  it('MER values are realistic (between 0% and 2%)', () => {
    const allETFs = [
      ...VALID_PLAN_DATA.investment_portfolio_blueprint.core_etf_recommendations,
      ...VALID_PLAN_DATA.investment_portfolio_blueprint.satellite_recommendations,
    ];
    for (const etf of allETFs) {
      expect(etf.mer, `${etf.ticker} MER should be < 2%`).toBeLessThanOrEqual(2);
      expect(etf.mer, `${etf.ticker} MER should be >= 0`).toBeGreaterThanOrEqual(0);
    }
  });

  it('core ETF allocations sum to a reasonable percentage', () => {
    const total = VALID_PLAN_DATA.investment_portfolio_blueprint.core_etf_recommendations
      .reduce((sum, etf) => sum + etf.allocation_percent, 0);
    expect(total).toBeGreaterThanOrEqual(50);
    expect(total).toBeLessThanOrEqual(100);
  });

  it('recommended allocation percentages sum to approximately 100', () => {
    const alloc = VALID_PLAN_DATA.investment_portfolio_blueprint.recommended_allocation;
    const total = alloc.canadian_equity + alloc.us_equity + alloc.international_equity
      + alloc.fixed_income + alloc.alternatives;
    expect(total).toBeGreaterThanOrEqual(95);
    expect(total).toBeLessThanOrEqual(105);
  });

  it('known ETF list contains common Canadian ETFs', () => {
    const essentialETFs = ['XEQT', 'VEQT', 'ZAG', 'XBB', 'VCN', 'VFV', 'XIC', 'XIU'];
    for (const ticker of essentialETFs) {
      expect(VALID_CANADIAN_ETFS.has(ticker), `${ticker} should be in the known ETF list`).toBe(true);
    }
  });
});

describe('Score Range Checks', () => {
  it('financial_health_score is between 1 and 100', () => {
    const score = VALID_PLAN_DATA.financial_health_diagnostic.financial_health_score;
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('score_breakdown sub-scores are each between 0 and 100', () => {
    const breakdown = VALID_PLAN_DATA.financial_health_diagnostic.score_breakdown;
    for (const [key, value] of Object.entries(breakdown)) {
      expect(value, `${key} sub-score`).toBeGreaterThanOrEqual(0);
      expect(value, `${key} sub-score`).toBeLessThanOrEqual(100);
    }
  });

  it('savings_rate_percent is between 0 and 100', () => {
    const rate = VALID_PLAN_DATA.financial_health_diagnostic.savings_rate_percent;
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it('retirement_number is a reasonable positive value', () => {
    const num = VALID_PLAN_DATA.retirement_readiness.retirement_number;
    expect(num).toBeGreaterThan(0);
    expect(num).toBeLessThan(50_000_000);
  });

  it('CPP estimate is within published range ($0 - $1,400/month for 2026)', () => {
    const cpp = VALID_PLAN_DATA.retirement_readiness.cpp_estimated_monthly;
    expect(cpp).toBeGreaterThanOrEqual(0);
    expect(cpp).toBeLessThanOrEqual(1400);
  });

  it('OAS estimate is within published range ($0 - $800/month for 2026)', () => {
    const oas = VALID_PLAN_DATA.retirement_readiness.oas_estimated_monthly;
    expect(oas).toBeGreaterThanOrEqual(0);
    expect(oas).toBeLessThanOrEqual(800);
  });

  it('monthly_savings_required is non-negative', () => {
    expect(VALID_PLAN_DATA.retirement_readiness.monthly_savings_required).toBeGreaterThanOrEqual(0);
  });

  it('total_debt is non-negative', () => {
    expect(VALID_PLAN_DATA.debt_elimination_plan.total_debt).toBeGreaterThanOrEqual(0);
  });

  it('avalanche method saves more or equal interest vs snowball', () => {
    const { avalanche_method, snowball_method } = VALID_PLAN_DATA.debt_elimination_plan;
    expect(avalanche_method.total_interest_paid).toBeLessThanOrEqual(snowball_method.total_interest_paid);
  });

  it('insurance gap equals need minus coverage', () => {
    const { life_insurance_need, current_coverage, life_insurance_gap } =
      VALID_PLAN_DATA.insurance_coverage_audit;
    expect(life_insurance_gap).toBe(life_insurance_need - current_coverage);
  });

  it('net worth milestones ages are in ascending order', () => {
    const milestones = VALID_PLAN_DATA.lifetime_financial_roadmap.net_worth_milestones;
    for (let i = 1; i < milestones.length; i++) {
      expect(milestones[i].age).toBeGreaterThan(milestones[i - 1].age);
    }
  });

  it('net worth milestones values generally increase', () => {
    const milestones = VALID_PLAN_DATA.lifetime_financial_roadmap.net_worth_milestones;
    for (let i = 1; i < milestones.length; i++) {
      expect(milestones[i].target_net_worth).toBeGreaterThanOrEqual(milestones[i - 1].target_net_worth);
    }
  });

  it('financial_independence_target_age is between 45 and 85', () => {
    const age = VALID_PLAN_DATA.lifetime_financial_roadmap.financial_independence_target_age;
    expect(age).toBeGreaterThanOrEqual(45);
    expect(age).toBeLessThanOrEqual(85);
  });
});

describe('Full Schema Validation', () => {
  it('complete plan passes Zod schema validation', () => {
    const result = FinancialPlanSchema.safeParse(VALID_PLAN_DATA);
    expect(result.success).toBe(true);
  });

  it('schema validation returns detailed errors for invalid data', () => {
    const invalidPlan = { ...VALID_PLAN_DATA, financial_health_diagnostic: null };
    const result = FinancialPlanSchema.safeParse(invalidPlan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe('Canadian Content Requirements', () => {
  it('plan references Canadian account types (RRSP, TFSA, FHSA)', () => {
    const planJson = JSON.stringify(VALID_PLAN_DATA);
    expect(planJson).toContain('RRSP');
    expect(planJson).toContain('TFSA');
    expect(planJson).toContain('FHSA');
  });

  it('plan references CPP and OAS', () => {
    const planJson = JSON.stringify(VALID_PLAN_DATA);
    expect(planJson).toContain('CPP');
    expect(planJson).toContain('OAS');
  });

  it('plan includes province-specific tax analysis', () => {
    const provincial = VALID_PLAN_DATA.tax_efficiency_review.provincial_tax_considerations;
    expect(provincial.length).toBeGreaterThan(20);
  });

  it('market context references Canadian market', () => {
    const context = VALID_PLAN_DATA.market_context_report;
    expect(context.canadian_market_context).toBeTruthy();
    expect(context.canadian_market_context.length).toBeGreaterThan(20);
  });

  it('retirement income sources include CPP and OAS', () => {
    const sources = VALID_PLAN_DATA.retirement_readiness.retirement_income_sources;
    const sourceNames = sources.map((s) => s.source.toLowerCase());
    expect(sourceNames.some((s) => s.includes('cpp'))).toBe(true);
    expect(sourceNames.some((s) => s.includes('oas'))).toBe(true);
  });
});
