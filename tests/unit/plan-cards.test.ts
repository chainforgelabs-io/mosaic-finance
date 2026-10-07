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
});
