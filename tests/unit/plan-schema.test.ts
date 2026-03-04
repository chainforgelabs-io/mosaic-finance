import { describe, it, expect } from 'vitest';
import { FinancialPlanSchema, PLAN_SECTIONS } from '@/lib/validators/plan-schema';
import { VALID_PLAN_DATA, createPlanWithOverrides } from '../fixtures/plan-data';

describe('Plan JSON Schema Validation', () => {
  it('accepts a fully valid plan', () => {
    const result = FinancialPlanSchema.safeParse(VALID_PLAN_DATA);
    expect(result.success).toBe(true);
  });

  it('requires all 8 sections', () => {
    expect(PLAN_SECTIONS).toHaveLength(8);
    for (const section of PLAN_SECTIONS) {
      expect(VALID_PLAN_DATA).toHaveProperty(section);
    }
  });

  it('rejects a plan missing a section', () => {
    for (const section of PLAN_SECTIONS) {
      const incomplete = { ...VALID_PLAN_DATA };
      delete (incomplete as Record<string, unknown>)[section];
      const result = FinancialPlanSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    }
  });

  it('rejects null plan data', () => {
    const result = FinancialPlanSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects an empty object', () => {
    const result = FinancialPlanSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  describe('financial_health_diagnostic', () => {
    it('requires financial_health_score between 1 and 100', () => {
      const tooLow = createPlanWithOverrides({
        financial_health_diagnostic: {
          ...VALID_PLAN_DATA.financial_health_diagnostic,
          financial_health_score: 0,
        },
      });
      expect(FinancialPlanSchema.safeParse(tooLow).success).toBe(false);

      const tooHigh = createPlanWithOverrides({
        financial_health_diagnostic: {
          ...VALID_PLAN_DATA.financial_health_diagnostic,
          financial_health_score: 101,
        },
      });
      expect(FinancialPlanSchema.safeParse(tooHigh).success).toBe(false);
    });

    it('requires savings_rate_percent between 0 and 100', () => {
      const negative = createPlanWithOverrides({
        financial_health_diagnostic: {
          ...VALID_PLAN_DATA.financial_health_diagnostic,
          savings_rate_percent: -5,
        },
      });
      expect(FinancialPlanSchema.safeParse(negative).success).toBe(false);
    });

    it('requires at least one key finding', () => {
      const noFindings = createPlanWithOverrides({
        financial_health_diagnostic: {
          ...VALID_PLAN_DATA.financial_health_diagnostic,
          key_findings: [],
        },
      });
      expect(FinancialPlanSchema.safeParse(noFindings).success).toBe(false);
    });

    it('requires at least one action item', () => {
      const noActions = createPlanWithOverrides({
        financial_health_diagnostic: {
          ...VALID_PLAN_DATA.financial_health_diagnostic,
          action_items: [],
        },
      });
      expect(FinancialPlanSchema.safeParse(noActions).success).toBe(false);
    });

    it('requires valid debt ranking priorities', () => {
      const invalidPriority = createPlanWithOverrides({
        financial_health_diagnostic: {
          ...VALID_PLAN_DATA.financial_health_diagnostic,
          debt_ranking: [{ debt: 'Test', priority: 'urgent' as 'high', reason: 'test' }],
        },
      });
      expect(FinancialPlanSchema.safeParse(invalidPriority).success).toBe(false);
    });

    it('validates score_breakdown sub-scores are 0-100', () => {
      const badBreakdown = createPlanWithOverrides({
        financial_health_diagnostic: {
          ...VALID_PLAN_DATA.financial_health_diagnostic,
          score_breakdown: { cash_flow: 150, debt: 55, savings: 70, protection: 45, planning: 80 },
        },
      });
      expect(FinancialPlanSchema.safeParse(badBreakdown).success).toBe(false);
    });
  });

  describe('retirement_readiness', () => {
    it('requires fhsa_eligible as boolean', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          retirement_readiness: {
            ...VALID_PLAN_DATA.retirement_readiness,
            fhsa_eligible: 'yes' as unknown as boolean,
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it('requires retirement_number to be non-negative', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          retirement_readiness: {
            ...VALID_PLAN_DATA.retirement_readiness,
            retirement_number: -100000,
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it('requires at least one retirement income source', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          retirement_readiness: {
            ...VALID_PLAN_DATA.retirement_readiness,
            retirement_income_sources: [],
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it('requires CPP and OAS estimates to be non-negative', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          retirement_readiness: {
            ...VALID_PLAN_DATA.retirement_readiness,
            cpp_estimated_monthly: -500,
          },
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe('investment_portfolio_blueprint', () => {
    it('requires at least one core ETF recommendation', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          investment_portfolio_blueprint: {
            ...VALID_PLAN_DATA.investment_portfolio_blueprint,
            core_etf_recommendations: [],
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it('requires allocation percentages between 0 and 100', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          investment_portfolio_blueprint: {
            ...VALID_PLAN_DATA.investment_portfolio_blueprint,
            recommended_allocation: {
              canadian_equity: -10,
              us_equity: 30,
              international_equity: 15,
              fixed_income: 25,
              alternatives: 5,
            },
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it('requires MER between 0 and 5', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          investment_portfolio_blueprint: {
            ...VALID_PLAN_DATA.investment_portfolio_blueprint,
            core_etf_recommendations: [
              { ticker: 'XEQT', name: 'Test', mer: 10, allocation_percent: 100, rationale: 'Test' },
            ],
          },
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe('debt_elimination_plan', () => {
    it('requires total_debt to be non-negative', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          debt_elimination_plan: {
            ...VALID_PLAN_DATA.debt_elimination_plan,
            total_debt: -5000,
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it('requires both avalanche and snowball methods', () => {
      const missingAvalanche = createPlanWithOverrides({
        debt_elimination_plan: {
          ...VALID_PLAN_DATA.debt_elimination_plan,
          avalanche_method: undefined as unknown as typeof VALID_PLAN_DATA.debt_elimination_plan.avalanche_method,
        },
      });
      expect(FinancialPlanSchema.safeParse(missingAvalanche).success).toBe(false);
    });
  });

  describe('market_context_report', () => {
    it('requires a disclaimer field', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          market_context_report: {
            ...VALID_PLAN_DATA.market_context_report,
            disclaimer: '',
          },
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe('lifetime_financial_roadmap', () => {
    it('requires milestones with valid age ranges (18-120)', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          lifetime_financial_roadmap: {
            ...VALID_PLAN_DATA.lifetime_financial_roadmap,
            net_worth_milestones: [
              { age: 10, target_net_worth: 0, key_actions: 'Too young' },
            ],
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it('requires financial_independence_target_age within valid range', () => {
      const result = FinancialPlanSchema.safeParse(
        createPlanWithOverrides({
          lifetime_financial_roadmap: {
            ...VALID_PLAN_DATA.lifetime_financial_roadmap,
            financial_independence_target_age: 150,
          },
        }),
      );
      expect(result.success).toBe(false);
    });
  });
});
