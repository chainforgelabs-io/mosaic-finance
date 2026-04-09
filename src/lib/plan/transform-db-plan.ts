import type {
  FinancialPlan,
  PlanStatus,
  PlanSection,
  FinancialCardData,
  ComparisonTable,
  CoverageRec,
  RiskLabel,
} from "@/types";

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString("en-CA")}`;
}

function card(label: string, value: unknown, unit?: string): FinancialCardData | null {
  if (value == null) return null;
  const num = Number(value);
  const display = Number.isNaN(num) ? String(value) : fmt(num);
  return { label, value: display, unit };
}

function proseLines(...parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join("\n\n");
}

function labeledProse(label: string, value: unknown): string | false {
  return value ? `${label}: ${value}` : false;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildSections(raw: any): PlanSection[] {
  const sections: PlanSection[] = [];
  const d = raw.financial_health_diagnostic;
  const r = raw.retirement_readiness;
  const ipb = raw.investment_portfolio_blueprint;
  const ter = raw.tax_efficiency_review;
  const dep = raw.debt_elimination_plan;
  const ica = raw.insurance_coverage_audit;
  const mcr = raw.market_context_report;
  const lfr = raw.lifetime_financial_roadmap;

  function actionItems(data: any, key: string) {
    return (data?.action_items ?? []).map((text: string, i: number) => ({
      id: `${key}-${i}`,
      text,
      priority: i === 0 ? ("high" as const) : i < 3 ? ("medium" as const) : ("low" as const),
    }));
  }

  if (d) {
    const cards = [
      card("Net Worth", d.net_worth),
      card("Monthly Cash Flow", d.cash_flow_monthly),
      card("Savings Rate", d.savings_rate_percent != null ? `${d.savings_rate_percent}%` : null),
      card("Emergency Fund", d.emergency_fund_months != null ? `${d.emergency_fund_months}` : null, "months"),
    ].filter(Boolean) as FinancialCardData[];

    const findings = Array.isArray(d.key_findings) ? d.key_findings.join("\n\n") : "";

    sections.push({
      id: "financial_health_diagnostic",
      title: "Financial Health Diagnostic",
      subtitle: "A comprehensive snapshot of your current financial position",
      status: "ai_generated",
      summary: d.gap_analysis ?? "",
      cards,
      prose: findings,
      actionItems: actionItems(d, "fhd"),
    });
  }

  if (r) {
    const cards = [
      card("Retirement Number", r.retirement_number),
      card("Current Trajectory", r.current_trajectory),
      card("Monthly Savings Required", r.monthly_savings_required),
      card("Est. CPP Monthly", r.cpp_estimated_monthly),
    ].filter(Boolean) as FinancialCardData[];

    sections.push({
      id: "retirement_readiness",
      title: "Retirement Readiness",
      subtitle: "Your path to financial independence and retirement security",
      status: "ai_generated",
      summary: r.gap_analysis ?? "",
      cards,
      prose: proseLines(
        labeledProse("RRSP Strategy", r.rrsp_strategy),
        labeledProse("TFSA Strategy", r.tfsa_strategy),
        r.fhsa_eligible && labeledProse("FHSA Strategy", r.fhsa_strategy),
        labeledProse("Gap Analysis", r.gap_analysis),
      ),
      actionItems: actionItems(r, "ret"),
    });
  }

  if (ipb) {
    const alloc = (ipb.recommended_allocation ?? {}) as Record<string, number>;
    const allocCards = Object.entries(alloc).map(([k, v]) => ({
      label: k.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      value: `${v}%`,
    }));

    const etfTable = ((ipb.core_etf_recommendations ?? []) as any[]).map((etf: any) => ({
      ticker: etf.ticker ?? "",
      name: etf.name ?? "",
      mer: etf.mer != null ? `${etf.mer}%` : "",
      allocation: etf.allocation_percent != null ? `${etf.allocation_percent}%` : "",
      rationale: etf.rationale ?? "",
    }));

    sections.push({
      id: "investment_portfolio_blueprint",
      title: "Investment Portfolio Blueprint",
      subtitle: "Personalized asset allocation and ETF considerations",
      status: "ai_generated",
      summary: ipb.current_portfolio_assessment ?? "",
      cards: allocCards,
      prose: proseLines(
        labeledProse("Current Portfolio Assessment", ipb.current_portfolio_assessment),
        labeledProse("Account Location Strategy", ipb.account_location_strategy),
        labeledProse("Rebalancing Schedule", ipb.rebalancing_schedule),
      ),
      actionItems: actionItems(ipb, "ipb"),
      etfTable: etfTable.length > 0 ? etfTable : undefined,
    });
  }

  if (ter) {
    const cards = [
      card("Annual Tax Savings", ter.estimated_annual_tax_savings),
      card("RRSP Contribution", ter.rrsp_contribution_recommendation),
    ].filter(Boolean) as FinancialCardData[];

    sections.push({
      id: "tax_efficiency_review",
      title: "Tax Efficiency Review",
      subtitle: "Maximizing your after-tax returns through smart strategy",
      status: "ai_generated",
      summary: "",
      cards,
      prose: proseLines(
        labeledProse("RRSP Room Analysis", ter.rrsp_room_analysis),
        labeledProse("TFSA Strategy", ter.tfsa_strategy),
        labeledProse("FHSA Analysis", ter.fhsa_analysis),
        labeledProse("Provincial Considerations", ter.provincial_tax_considerations),
        labeledProse("Tax-Loss Harvesting", ter.tax_loss_harvesting_opportunities),
        labeledProse("Income Splitting", ter.income_splitting_opportunities),
      ),
      actionItems: actionItems(ter, "ter"),
    });
  }

  if (dep) {
    const avalanche = (dep.avalanche_method ?? {}) as any;
    const snowball = (dep.snowball_method ?? {}) as any;

    const cards = [
      card("Total Debt", dep.total_debt),
      { label: "Recommended Method", value: String(dep.recommended_method ?? "--") },
    ].filter(Boolean) as FinancialCardData[];

    const tables: ComparisonTable[] = [];
    if (avalanche.payoff_months != null || snowball.payoff_months != null) {
      tables.push({
        title: "Debt Repayment Comparison",
        headers: ["Method", "Total Interest Paid", "Payoff Timeline"],
        rows: [
          { label: "Avalanche", values: [avalanche.total_interest_paid != null ? fmtFull(avalanche.total_interest_paid) : "—", avalanche.payoff_months != null ? `${avalanche.payoff_months} months` : "—"] },
          { label: "Snowball", values: [snowball.total_interest_paid != null ? fmtFull(snowball.total_interest_paid) : "—", snowball.payoff_months != null ? `${snowball.payoff_months} months` : "—"] },
        ],
      });
    }

    sections.push({
      id: "debt_elimination_plan",
      title: "Debt Elimination Plan",
      subtitle: "Your optimized path to becoming debt-free",
      status: "ai_generated",
      summary: dep.recommendation_rationale ?? "",
      cards,
      prose: proseLines(
        labeledProse("Why This Method", dep.recommendation_rationale),
        labeledProse("Refinancing Analysis", dep.refinancing_analysis),
      ),
      actionItems: actionItems(dep, "dep"),
      tables: tables.length > 0 ? tables : undefined,
    });
  }

  if (ica) {
    const cards = [
      card("Life Insurance Need", ica.life_insurance_need),
      card("Current Coverage", ica.current_coverage),
      card("Coverage Gap", ica.life_insurance_gap),
    ].filter(Boolean) as FinancialCardData[];

    const coverageRecs: CoverageRec[] = ((ica.coverage_recommendations ?? []) as any[]).map((rec: any) => ({
      type: rec.type ?? "",
      priority: rec.priority ?? "medium",
      rationale: rec.rationale ?? "",
    }));

    sections.push({
      id: "insurance_coverage_audit",
      title: "Insurance Coverage Audit",
      subtitle: "Identifying gaps in your financial protection",
      status: "ai_generated",
      summary: "",
      cards,
      prose: proseLines(
        labeledProse("Disability Insurance", ica.disability_insurance_analysis),
        labeledProse("Critical Illness", ica.critical_illness_analysis),
      ),
      actionItems: actionItems(ica, "ica"),
      coverageRecs: coverageRecs.length > 0 ? coverageRecs : undefined,
    });
  }

  if (mcr) {
    sections.push({
      id: "market_context_report",
      title: "Market Context Report",
      subtitle: "Current market environment relevant to your portfolio",
      status: "ai_generated",
      summary: "",
      cards: [],
      prose: proseLines(
        mcr.macro_environment,
        labeledProse("Canadian Market", mcr.canadian_market_context),
        labeledProse("Rate Environment Impact", mcr.rate_environment_impact),
        labeledProse("Portfolio-Specific Risks", mcr.portfolio_specific_risks),
        labeledProse("Portfolio-Specific Opportunities", mcr.portfolio_specific_opportunities),
      ),
      actionItems: actionItems(mcr, "mcr"),
      disclaimer: mcr.disclaimer ?? "This market commentary is educational context only.",
    });
  }

  if (lfr) {
    const cards = [
      card("Financial Independence Number", lfr.financial_independence_number),
      { label: "Target Age", value: String(lfr.financial_independence_target_age ?? "--") },
    ].filter(Boolean) as FinancialCardData[];

    const currentPriorities = Array.isArray(lfr.current_decade_priorities)
      ? "This Decade:\n" + lfr.current_decade_priorities.map((p: string) => `  → ${p}`).join("\n")
      : "";
    const nextPriorities = Array.isArray(lfr.next_decade_priorities)
      ? "Next Decade:\n" + lfr.next_decade_priorities.map((p: string) => `  → ${p}`).join("\n")
      : "";

    const milestones = (lfr.net_worth_milestones ?? []) as any[];
    const tables: ComparisonTable[] = [];
    if (milestones.length > 0) {
      tables.push({
        title: "Net Worth Milestones",
        headers: ["Age", "Target Net Worth", "Key Actions"],
        rows: milestones.map((m: any) => ({
          label: String(m.age ?? ""),
          values: [m.target_net_worth != null ? fmtFull(m.target_net_worth) : "—", String(m.key_actions ?? "—")],
        })),
      });
    }

    sections.push({
      id: "lifetime_financial_roadmap",
      title: "Lifetime Financial Roadmap",
      subtitle: "Your decade-by-decade path to financial independence",
      status: "ai_generated",
      summary: lfr.decade_by_decade_summary ?? "",
      cards,
      prose: proseLines(currentPriorities, nextPriorities, lfr.decade_by_decade_summary),
      actionItems: actionItems(lfr, "lfr"),
      tables: tables.length > 0 ? tables : undefined,
    });
  }

  return sections;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type DbPlanRow = {
  id: string;
  status: string;
  plan_data: unknown;
  created_at: string;
};

export function transformDbPlanToFinancialPlan(
  dbPlan: DbPlanRow,
  options?: { userId?: string; riskLabel?: RiskLabel },
): FinancialPlan {
  const raw =
    typeof dbPlan.plan_data === "string"
      ? JSON.parse(dbPlan.plan_data)
      : (dbPlan.plan_data ?? {});

  const diag = raw.financial_health_diagnostic;
  const ret = raw.retirement_readiness;

  const healthScore = diag?.financial_health_score ?? 0;
  const netWorth =
    diag?.net_worth != null
      ? fmt(diag.net_worth)
      : ret?.current_trajectory != null
        ? fmt(ret.current_trajectory)
        : "--";
  const monthlyCashFlow =
    diag?.cash_flow_monthly != null ? fmt(diag.cash_flow_monthly) : "--";
  const savingsRate =
    diag?.savings_rate_percent != null ? `${diag.savings_rate_percent}%` : "--";
  const retirementGap = ret ? fmt(ret.retirement_number - ret.current_trajectory) : "--";

  return {
    id: dbPlan.id,
    userId: options?.userId ?? "",
    status: dbPlan.status as PlanStatus,
    healthScore,
    riskLabel: options?.riskLabel ?? "Balanced",
    createdAt: dbPlan.created_at,
    estimatedDelivery:
      dbPlan.status === "pending_review" ? "Within 24 hours" : undefined,
    sections: buildSections(raw),
    netWorth,
    monthlyCashFlow,
    savingsRate,
    retirementGap,
  };
}
