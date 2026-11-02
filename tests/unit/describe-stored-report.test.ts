import { describe, expect, it } from "vitest";
import { describeStoredReport, descriptiveNotes, descriptiveText } from "@/lib/plan/describe-stored-report";
import { transformDbPlanToFinancialPlan } from "@/lib/plan/transform-db-plan";
import { buildPlanGenerationPrompt } from "@/lib/claude/prompts/plan-generation";

describe("stored report copy", () => {
  it("drops instructions, a return assumption, and an insurance gap", () => {
    expect(descriptiveNotes([
      "Track the emergency fund toward a longer cushion.",
      "The cash balance covers about two months of expenses.",
      "This is educational information, not financial advice.",
    ])).toEqual(["The cash balance covers about two months of expenses."]);

    expect(descriptiveText(
      "The registered accounts hold cash. The projection uses a 5% nominal return. The cash figure is the balance on file.",
    )).toBe("The registered accounts hold cash. The cash figure is the balance on file.");

    const plan = describeStoredReport({
      insurance_coverage_audit: {
        life_insurance_need: 100,
        current_coverage: 40,
        life_insurance_gap: 60,
        critical_illness_analysis: "A calculated figure sits next to the coverage on file. The estimated gap is large.",
        coverage_recommendations: [
          { type: "Life", priority: "high", rationale: "Review the estimated life insurance gap with an advisor." },
          { type: "Disability", priority: "medium", rationale: "Employer coverage is on file. The benefit amount is not." },
        ],
        action_items: ["Confirm the beneficiary designations."],
      },
      debt_elimination_plan: {
        recommendation_rationale: "Avalanche is mathematically optimal. The interest totals differ.",
        action_items: ["Consider paying the higher rate first."],
      },
    });

    const insurance = plan.insurance_coverage_audit as Record<string, unknown>;
    expect(insurance.life_insurance_gap).toBeUndefined();
    expect(insurance.critical_illness_analysis).toBe("A calculated figure sits next to the coverage on file.");
    expect(insurance.coverage_recommendations).toEqual([
      { type: "Disability", priority: "medium", rationale: "Employer coverage is on file. The benefit amount is not." },
    ]);
    expect(insurance.action_items).toEqual([]);

    const debt = plan.debt_elimination_plan as Record<string, unknown>;
    expect(debt.recommendation_rationale).toBe("The interest totals differ.");
    expect(debt.action_items).toEqual([]);
  });

  it("hides the insurance difference card and the instruction notes", () => {
    const view = transformDbPlanToFinancialPlan({
      id: "plan-1",
      status: "delivered",
      created_at: "2026-10-23T00:00:00.000Z",
      plan_data: {
        insurance_coverage_audit: {
          life_insurance_need: 1000,
          current_coverage: 250,
          life_insurance_gap: 750,
          action_items: ["Review the coverage gap.", "Coverage on file is listed in this section."],
        },
        retirement_readiness: {
          gap_analysis: "Balances on file are shown here. Growth assumes a 5% nominal return.",
          action_items: ["Explore a larger contribution."],
        },
      },
    });
    const insurance = view.sections.find((section) => section.id === "insurance_coverage_audit");
    expect(insurance?.cards.some((card) => card.label === "Difference")).toBe(false);
    expect(insurance?.cards.map((card) => card.label)).toEqual(["Calculated life coverage", "Coverage on file"]);
    expect(insurance?.actionItems).toEqual([
      expect.objectContaining({ text: "Coverage on file is listed in this section." }),
    ]);
    const retirement = view.sections.find((section) => section.id === "retirement_readiness");
    expect(retirement?.summary).toBe("Balances on file are shown here.");
    expect(retirement?.prose).not.toMatch(/nominal return|Explore/);
    expect(retirement?.actionItems).toEqual([]);
  });

  it("drops shortfall, worth reviewing, insurance gaps, a savings task, and a named payoff order", () => {
    const kept = descriptiveText(
      "The registered accounts hold cash. A pension on file offsets this gap, but a shortfall likely remains. [VERIFY WITH A PROFESSIONAL] for a personalized projection.",
    );
    expect(kept).toBe("The registered accounts hold cash.");

    const holdings = descriptiveText(
      "Holdings on file are cash. The mix may not align with the stated profile — this is worth reviewing.",
    );
    expect(holdings).toBe("Holdings on file are cash.");

    const view = transformDbPlanToFinancialPlan({
      id: "plan-1",
      status: "delivered",
      created_at: "2026-10-23T00:00:00.000Z",
      plan_data: {
        debt_elimination_plan: {
          recommendation_rationale: "Prioritizing the higher-rate balance tackles that rate first. The interest totals differ.",
        },
        lifetime_financial_roadmap: {
          decade_by_decade_summary: "The early years include closing insurance gaps. Later years show the same balances.",
          current_decade_priorities: ["Closing insurance gaps is the focus."],
          net_worth_milestones: [
            { age: 50, target_net_worth: 1000, key_actions: "Evaluate progress and adjust savings if a gap persists." },
          ],
        },
      },
    });
    const debt = view.sections.find((section) => section.id === "debt_elimination_plan");
    expect(debt?.prose).toContain("The interest totals differ.");
    expect(debt?.prose).not.toMatch(/[Pp]rioritiz|higher-rate|tackl/);
    const decades = view.sections.find((section) => section.id === "lifetime_financial_roadmap");
    expect(decades?.summary).toBe("Later years show the same balances.");
    expect(decades?.prose).not.toMatch(/insurance gaps|This decade/);
    const note = decades?.tables?.[0]?.rows[0]?.values[1];
    expect(note).toBe("—");
  });
});

describe("plan generation prompt observations", () => {
  const prompt = buildPlanGenerationPrompt({
    profile: null,
    userProfile: null,
    holdings: null,
    fixedAssets: null,
    riskProfile: null,
    marketContext: null,
    generatedAt: "2026-10-07T00:00:00.000Z",
  });

  it("asks for observations and bans return assumptions, an optimal method, and an insurance gap", () => {
    expect(prompt).not.toContain("action items to one sentence");
    expect(prompt).toContain("Do not assume or state an investment return");
    expect(prompt).toContain("Do not call either method mathematically optimal");
    expect(prompt).toContain("Do not describe an insurance gap");
    expect(prompt).toContain("Do not start one with track, review, explore, consider");
    expect(prompt).toContain("Do not write the words shortfall or gap");
    expect(prompt).toContain("worth reviewing");
    expect(prompt).toContain("Do not name a balance or a rate");
    expect(prompt).toContain("closing insurance gaps");
  });
});
