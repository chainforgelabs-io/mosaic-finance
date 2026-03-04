import type {
  UserProfile,
  FinancialPlan,
  MarketContextReport,
  PlanSection,
} from "@/types";

export const mockUser: UserProfile = {
  id: "user-1",
  alias: "Northern_Investor",
  email: "investor@example.com",
  province: "Ontario",
  age: 34,
  employmentType: "Employed",
  familyStructure: "Married",
  tier: "pro",
};

const createSection = (
  id: string,
  title: string,
  overrides?: Partial<PlanSection>
): PlanSection => ({
  id,
  title,
  status: "cim_reviewed",
  summary: "",
  cards: [],
  prose: "",
  actionItems: [],
  ...overrides,
});

export const mockPlanSections: PlanSection[] = [
  createSection("executive-summary", "Executive Summary", {
    summary: "A comprehensive overview of your financial health and the recommended path forward.",
    cards: [
      { label: "NET WORTH", value: "$342,500", trend: "+12.4%", trendDirection: "up" },
      { label: "HEALTH SCORE", value: "74", trend: "+8", trendDirection: "up" },
      { label: "MONTHLY SURPLUS", value: "$1,850", trend: "+$320", trendDirection: "up" },
      { label: "RETIREMENT READINESS", value: "68%", trend: "+5%", trendDirection: "up" },
    ],
    prose: "Your financial position is solid with room for meaningful improvement. You have a strong savings rate and manageable debt levels. The primary opportunities lie in optimizing your RRSP contributions, consolidating your investment accounts for lower fees, and establishing a more structured approach to your retirement timeline.\n\nYour current trajectory shows you reaching your retirement goal by age 62, but with the recommended adjustments, we project this could be accelerated to age 58 — a four-year improvement that compounds significantly in terms of lifetime wealth.",
    actionItems: [
      { id: "a1", text: "Maximize RRSP contribution room ($18,200 available)", priority: "high" },
      { id: "a2", text: "Consolidate investment accounts to reduce MER drag", priority: "high" },
      { id: "a3", text: "Establish emergency fund target of $24,000", priority: "medium" },
    ],
  }),
  createSection("cash-flow", "Cash Flow Analysis", {
    summary: "Detailed breakdown of your monthly income and expenses.",
    cards: [
      { label: "GROSS INCOME", value: "$8,400", unit: "/mo" },
      { label: "NET INCOME", value: "$6,250", unit: "/mo" },
      { label: "TOTAL EXPENSES", value: "$4,400", unit: "/mo" },
      { label: "SAVINGS RATE", value: "29.6%", trend: "+3.2%", trendDirection: "up" },
    ],
    prose: "Your cash flow position is healthy with a 29.6% savings rate, well above the Canadian average of 5.8%. Your largest expense categories are housing (35% of net income) and transportation (12%). There is potential to redirect approximately $400/month from discretionary spending toward accelerated debt repayment.\n\nWe recommend the 50/30/20 framework adjusted for your situation: 50% needs, 25% wants, 25% savings/debt repayment. Your current allocation is close but optimizing the discretionary bucket would accelerate your timeline significantly.",
    actionItems: [
      { id: "b1", text: "Set up automatic transfer of $1,850/mo to investment accounts", priority: "high" },
      { id: "b2", text: "Review subscription services — potential $120/mo savings identified", priority: "low" },
    ],
  }),
  createSection("debt-management", "Debt Management", {
    summary: "Strategy for optimizing and eliminating outstanding debts.",
    cards: [
      { label: "TOTAL DEBT", value: "$186,400" },
      { label: "MORTGAGE", value: "$172,000" },
      { label: "LINE OF CREDIT", value: "$14,400", trend: "-$800", trendDirection: "down" },
      { label: "DEBT-TO-INCOME", value: "2.48x" },
    ],
    prose: "Your debt profile is mortgage-dominated, which is typical and manageable at your income level. The line of credit at 7.2% APR should be prioritized for accelerated repayment. At $600/month payments (up from current $400), this balance would be eliminated in 28 months, saving $1,840 in interest.\n\nYour mortgage rate of 4.89% is fixed until renewal in 2027. We recommend beginning to build a rate-change buffer of $200/month in a HISA to prepare for potential rate adjustments at renewal.",
    actionItems: [
      { id: "c1", text: "Increase line of credit payment to $600/mo (avalanche method)", priority: "high" },
      { id: "c2", text: "Start mortgage renewal buffer — $200/mo to HISA", priority: "medium" },
    ],
  }),
  createSection("retirement", "Retirement Projections", {
    summary: "Long-term projections for your retirement readiness.",
    cards: [
      { label: "TARGET RETIREMENT", value: "Age 58" },
      { label: "PROJECTED CORPUS", value: "$1.42M" },
      { label: "ANNUAL INCOME NEEDED", value: "$72,000" },
      { label: "CPP + OAS (EST.)", value: "$21,600", unit: "/yr" },
    ],
    prose: "Based on your current savings rate, investment allocation, and projected returns (6.2% nominal, 3.8% real), you are on track to accumulate approximately $1.42M by age 58. Combined with CPP and OAS benefits, this provides a projected retirement income of $72,000/year (in today's dollars), meeting your stated target of $70,000.\n\nThe critical assumption is maintaining your contribution rate through career transitions. A gap of even 2 years without contributions would shift your target retirement age to 61. We strongly recommend maintaining automated contributions regardless of employment changes.",
    actionItems: [
      { id: "d1", text: "Model retirement income with and without CPP bridge strategy", priority: "medium" },
      { id: "d2", text: "Review retirement target annually — adjust for lifestyle changes", priority: "low" },
    ],
  }),
  createSection("investment-strategy", "Investment Strategy", {
    summary: "Recommended portfolio allocation and ETF selections.",
    cards: [
      { label: "RISK PROFILE", value: "Balanced" },
      { label: "TARGET RETURN", value: "6.2%", unit: "/yr" },
      { label: "WEIGHTED MER", value: "0.18%" },
      { label: "DIVERSIFICATION", value: "Global" },
    ],
    prose: "Given your Balanced risk profile and 24-year investment horizon, we recommend a globally diversified portfolio weighted 70% equities / 25% fixed income / 5% alternatives. This allocation targets a 6.2% nominal annual return with a maximum drawdown tolerance of -25%.\n\nYour current portfolio is overly concentrated in Canadian equities (68% home bias vs. Canada's 3% global market weight). The recommended rebalancing would significantly improve diversification while maintaining your target risk level.",
    actionItems: [
      { id: "e1", text: "Rebalance to reduce Canadian home bias from 68% to 30%", priority: "high" },
      { id: "e2", text: "Consolidate to single brokerage for simplified rebalancing", priority: "medium" },
    ],
    etfTable: [
      { ticker: "XEQT", name: "iShares Core Equity ETF Portfolio", mer: "0.20%", allocation: "45%", rationale: "Global equity core — instant diversification across 9,000+ stocks" },
      { ticker: "XBB", name: "iShares Core Canadian Universe Bond", mer: "0.10%", allocation: "20%", rationale: "Canadian investment-grade bonds for stability and income" },
      { ticker: "VUN", name: "Vanguard US Total Market Index", mer: "0.16%", allocation: "15%", rationale: "US market tilt for growth exposure beyond XEQT allocation" },
      { ticker: "XEF", name: "iShares Core MSCI EAFE IMI", mer: "0.22%", allocation: "10%", rationale: "International developed markets exposure (ex-North America)" },
      { ticker: "XGRO", name: "iShares Core Growth ETF Portfolio", mer: "0.20%", allocation: "5%", rationale: "Growth-tilted all-in-one for TFSA simplicity" },
      { ticker: "ZAG", name: "BMO Aggregate Bond Index", mer: "0.09%", allocation: "5%", rationale: "Additional fixed income for near-term stability" },
    ],
  }),
  createSection("tax-optimization", "Tax Optimization", {
    summary: "Strategies to minimize tax burden and maximize registered account benefits.",
    cards: [
      { label: "RRSP ROOM", value: "$18,200" },
      { label: "TFSA ROOM", value: "$12,500" },
      { label: "TAX SAVINGS (EST.)", value: "$5,460", trend: "New", trendDirection: "up" },
      { label: "MARGINAL RATE", value: "29.65%" },
    ],
    prose: "You have significant unused registered account room that represents immediate tax optimization opportunities. Contributing $18,200 to your RRSP would generate an estimated $5,460 tax refund at your marginal rate, which should be redirected to your TFSA for tax-free growth.\n\nWe recommend a priority waterfall: 1) RRSP to employer match (if applicable), 2) TFSA to maximize tax-free growth room, 3) RRSP to reduce current taxable income, 4) Non-registered for overflow. This sequence optimizes for both current tax savings and long-term tax-free compounding.",
    actionItems: [
      { id: "f1", text: "Contribute $18,200 to RRSP before March deadline", priority: "high" },
      { id: "f2", text: "Redirect RRSP refund ($5,460) directly to TFSA", priority: "high" },
      { id: "f3", text: "Consider FHSA if first home purchase is planned", priority: "medium" },
    ],
  }),
  createSection("insurance-estate", "Insurance & Estate Planning", {
    summary: "Protection strategies for your financial plan.",
    cards: [
      { label: "LIFE INSURANCE NEED", value: "$500K" },
      { label: "DISABILITY COVERAGE", value: "60%" },
      { label: "CRITICAL ILLNESS", value: "Review" },
      { label: "WILL STATUS", value: "Needed" },
    ],
    prose: "As a married individual with shared financial obligations, adequate insurance coverage is essential to protect your plan. Based on your income replacement needs and outstanding mortgage, we recommend $500,000 in term life coverage (20-year term), which would cost approximately $35-45/month for your age and health profile.\n\nYour employer provides 60% disability coverage, which is adequate for short-term needs but may be insufficient for a prolonged disability. Consider a top-up individual policy to reach 70% of net income. Estate planning should be addressed promptly — a basic will and powers of attorney are essential documents that most Canadians neglect.",
    actionItems: [
      { id: "g1", text: "Obtain quotes for $500K 20-year term life insurance", priority: "high" },
      { id: "g2", text: "Draft will and powers of attorney with a licensed professional", priority: "high" },
      { id: "g3", text: "Review employer disability coverage and assess top-up need", priority: "medium" },
    ],
  }),
  createSection("next-steps", "Next Steps & Action Plan", {
    summary: "Prioritized timeline for implementing all recommendations.",
    cards: [
      { label: "IMMEDIATE ACTIONS", value: "4" },
      { label: "30-DAY TARGETS", value: "3" },
      { label: "90-DAY TARGETS", value: "5" },
      { label: "ANNUAL REVIEWS", value: "2" },
    ],
    prose: "Your financial plan is comprehensive but implementation is what creates results. Below is a prioritized action timeline. We recommend tackling the immediate actions this week, then scheduling the 30-day items as calendar reminders.\n\nThe most impactful single action is maximizing your RRSP contribution before the March deadline — this alone generates $5,460 in tax savings and accelerates your retirement timeline. Combined with the line of credit payoff acceleration, these two changes improve your projected retirement age by 2.5 years.",
    actionItems: [
      { id: "h1", text: "This week: Set up automated RRSP contributions ($1,517/mo)", priority: "high" },
      { id: "h2", text: "This week: Increase line of credit payment to $600/mo", priority: "high" },
      { id: "h3", text: "Within 30 days: Open brokerage account and begin portfolio rebalance", priority: "high" },
      { id: "h4", text: "Within 30 days: Obtain life insurance quotes", priority: "medium" },
      { id: "h5", text: "Within 90 days: Complete will and powers of attorney", priority: "medium" },
    ],
  }),
];

export const mockDeliveredPlan: FinancialPlan = {
  id: "plan-001",
  userId: "user-1",
  status: "delivered",
  healthScore: 74,
  riskLabel: "Balanced",
  createdAt: "2026-02-28T10:00:00Z",
  deliveredAt: "2026-03-01T14:30:00Z",
  sections: mockPlanSections,
  netWorth: "$342,500",
  monthlyCashFlow: "$1,850",
  savingsRate: "29.6%",
  retirementGap: "$28,000",
};

export const mockPendingPlan: FinancialPlan = {
  id: "plan-002",
  userId: "user-1",
  status: "pending_review",
  healthScore: 0,
  riskLabel: "Balanced",
  createdAt: "2026-03-04T08:00:00Z",
  estimatedDelivery: "Within 24 hours",
  sections: [],
  netWorth: "",
  monthlyCashFlow: "",
  savingsRate: "",
  retirementGap: "",
};

export const mockMarketContext: MarketContextReport = {
  id: "mc-001",
  updatedAt: "2026-03-03T09:00:00Z",
  headline: "Bank of Canada holds rate steady at 3.25% — equity markets respond positively",
  macroSummary: "Canadian GDP growth revised upward to 2.1% annualized.",
  rateSummary: "Overnight rate unchanged. Markets pricing in potential 25bps cut by June.",
  portfolioRelevance: "Bond yields stabilizing supports your fixed income allocation.",
  riskFactors: [
    "US trade policy uncertainty may impact Canadian exports",
    "Housing market showing signs of re-acceleration in GTA",
    "Oil price volatility affecting energy-heavy TSX composition",
  ],
  indicators: [
    { label: "S&P/TSX", value: "22,450", change: "+1.2%", direction: "up" },
    { label: "S&P 500", value: "5,890", change: "+0.8%", direction: "up" },
    { label: "CA 10Y Bond", value: "3.15%", change: "-0.05%", direction: "down" },
  ],
};
