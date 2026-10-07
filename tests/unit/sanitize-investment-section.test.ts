import { describe, expect, it } from "vitest";
import { buildPlanGenerationPrompt } from "@/lib/claude/prompts/plan-generation";
import { sanitizeInvestmentSection } from "@/lib/plan/sanitize-investment-section";

describe("sanitizeInvestmentSection", () => {
  it("drops ticker weights, return figures, and extra fund picks", () => {
    const plan = sanitizeInvestmentSection({
      investment_portfolio_blueprint: {
        recommended_allocation: { canadian_equity: 30, us_equity: 25, international_equity: 20, fixed_income: 20, alternatives: 5 },
        core_etf_recommendations: [
          { ticker: "XEQT", name: "Equity", mer: 0.2, allocation_percent: 40, rationale: "Global equities", five_year_return_benchmark: "9.8% annualized" },
          { ticker: "ZAG", name: "Bonds", mer: 0.09, allocation_percent: 20, rationale: "Canadian bonds", five_year_return_benchmark: "1.2%" },
          { ticker: "VCN", name: "Canada", mer: 0.05, allocation_percent: 15, rationale: "Canadian equities" },
          { ticker: "XBB", name: "Universe", mer: 0.1, allocation_percent: 5, rationale: "More bonds" },
        ],
        satellite_recommendations: [
          { ticker: "XRE", name: "REIT", mer: 0.61, allocation_percent: 5, rationale: "Real estate" },
        ],
      },
    });

    const section = plan.investment_portfolio_blueprint as {
      core_etf_recommendations: Record<string, unknown>[];
      satellite_recommendations: unknown[];
      recommended_allocation: { canadian_equity: number };
    };

    expect(section.core_etf_recommendations).toHaveLength(3);
    expect(section.core_etf_recommendations[0]).toEqual({
      ticker: "XEQT",
      name: "Equity",
      mer: 0.2,
      rationale: "Global equities",
    });
    expect(section.satellite_recommendations).toEqual([]);
    expect(section.recommended_allocation.canadian_equity).toBe(30);
  });

  it("leaves a plan with no investment section unchanged", () => {
    const plan = { financial_health_diagnostic: { net_worth: 1 } };
    expect(sanitizeInvestmentSection(plan)).toEqual(plan);
  });
});

describe("plan generation prompt", () => {
  const prompt = buildPlanGenerationPrompt({
    profile: null,
    userProfile: null,
    holdings: null,
    fixedAssets: null,
    riskProfile: null,
    marketContext: null,
    generatedAt: "2026-10-07T00:00:00.000Z",
  });

  it("does not ask for a ticker weight or a return benchmark", () => {
    expect(prompt).not.toContain("five_year_return_benchmark");
    expect(prompt).not.toContain("allocation_percent");
    expect(prompt).not.toContain("ETF recommendations must be real");
  });

  it("asks for an illustrative mix and example funds only", () => {
    expect(prompt).toContain("illustrative mix of asset classes");
    expect(prompt).toContain("at most 3 real Canadian-listed ETFs");
    expect(prompt).toContain('"satellite_recommendations": []');
    expect(prompt).not.toContain("personalized asset allocation");
    expect(prompt).not.toContain("which account to prioritize");
  });
});
