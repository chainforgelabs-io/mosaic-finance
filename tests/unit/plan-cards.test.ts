import { describe, expect, it } from "vitest";
import { transformDbPlanToFinancialPlan } from "@/lib/plan/transform-db-plan";

describe("plan cards", () => {
  it("shows emergency fund as months, and money as dollars", () => {
    const plan = transformDbPlanToFinancialPlan({
      id: "plan-1",
      status: "delivered",
      created_at: "2026-01-01T00:00:00.000Z",
      plan_data: {
        financial_health_diagnostic: {
          net_worth: 500,
          emergency_fund_months: 3,
        },
      },
    });
    const section = plan.sections.find((item) => item.id === "financial_health_diagnostic");
    const emergency = section?.cards.find((item) => item.label === "Emergency Fund");
    const netWorth = section?.cards.find((item) => item.label === "Net Worth");
    expect(emergency).toEqual({ label: "Emergency Fund", value: "3", unit: "months" });
    expect(netWorth?.value).toBe("$500");
  });

  it("names report sections as education and does not pick a payoff method", () => {
    const plan = transformDbPlanToFinancialPlan({
      id: "plan-1",
      status: "delivered",
      created_at: "2026-01-01T00:00:00.000Z",
      plan_data: {
        investment_portfolio_blueprint: { current_portfolio_assessment: "Cash." },
        debt_elimination_plan: {
          total_debt: 1000,
          recommended_method: "avalanche",
          recommendation_rationale: "The interest totals differ.",
        },
        lifetime_financial_roadmap: { decade_by_decade_summary: "Later years." },
      },
    });
    const titles = plan.sections.map((item) => item.title).join(" ");
    expect(titles).toContain("Accounts and asset classes");
    expect(titles).toContain("Balances and payoff timelines");
    expect(titles).toContain("A look across the decades");
    expect(titles).not.toMatch(/Blueprint|Elimination Plan|Roadmap/);
    const debt = plan.sections.find((item) => item.id === "debt_elimination_plan");
    expect(debt?.cards.some((card) => card.label === "Recommended Method")).toBe(false);
    expect(debt?.subtitle).toContain("avalanche and snowball");
    expect(debt?.prose).toContain("How the two methods differ");
  });
});
