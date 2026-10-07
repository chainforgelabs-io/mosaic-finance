/**
 * The investment section is education about asset classes. Named funds are
 * examples of a category. Weights and historical returns on a ticker read as
 * a buy list, so they are removed before a report is stored. Already-stored
 * reports are stripped again at display time.
 */

const MAX_EXAMPLE_FUNDS = 3;

function stripFund(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const fund = { ...(raw as Record<string, unknown>) };
  delete fund.allocation_percent;
  delete fund.five_year_return_benchmark;
  return fund;
}

export function sanitizeInvestmentSection(
  planData: Record<string, unknown>,
): Record<string, unknown> {
  const raw = planData.investment_portfolio_blueprint;
  if (!raw || typeof raw !== "object") return planData;

  const section = { ...(raw as Record<string, unknown>) };
  const core = Array.isArray(section.core_etf_recommendations)
    ? section.core_etf_recommendations
    : [];

  section.core_etf_recommendations = core
    .map(stripFund)
    .filter((fund): fund is Record<string, unknown> => fund !== null)
    .slice(0, MAX_EXAMPLE_FUNDS);
  section.satellite_recommendations = [];

  return { ...planData, investment_portfolio_blueprint: section };
}
