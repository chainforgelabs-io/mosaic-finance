import { FOUNDING_PRICING } from "@/lib/config/pricing";

/**
 * Canonical offer copy. Every marketing surface, the dashboard TrackingLoop,
 * and settings import from here so the Guarantee is worded identically.
 *
 * Compliance: the Consistency Guarantee is conditioned only on logging
 * spending weekly and completing the monthly net-worth snapshot for 90 days,
 * measured by the Financial Health Score. Never on returns, savings, or
 * following action steps. See docs/hormozi-playbook.md and AGENTS.md.
 */

export const OFFER_NAME = "The 90-Day Canadian Money Reset";

export const OUTCOME_HEADLINE = "Is your money moving the right way?";

export const GUARANTEE_NAME = "Consistency Guarantee";

/** One sentence. Safe to show anywhere. */
export const GUARANTEE_SHORT =
  "Log weekly and snapshot monthly for 90 days. If your Financial Health Score hasn't improved, we refund your first payment.";

/** Longer form for the offer section and FAQ. */
export const GUARANTEE_LONG =
  "Log your spending each week and complete your monthly net-worth snapshot for 90 days. If your Financial Health Score hasn't improved by the end, we refund your first payment. The Score measures tracking consistency, not investment returns.";

export const REFUND_WINDOW_COPY = "First payment refundable for 30 days, no questions.";

export const GUARANTEE_ACTIONS = [
  { label: "Log spending", cadence: "once a week" },
  { label: "Snapshot net worth", cadence: "once a month" },
  { label: "Watch your Score", cadence: "for 90 days" },
] as const;

/** Named bonuses. Educational tools only. Nothing here promises a result. */
export const OFFER_BONUSES = [
  {
    title: "Canadian Money Mechanics Toolkit",
    desc: "FHSA, RRSP vs TFSA, and CPP timing calculators built on current Canadian rules. Free, no account needed.",
  },
  {
    title: "Life-Event Playbooks",
    desc: "Plain-language walkthroughs for a new job, a home purchase, or a growing family — what to update and what to ask an advisor.",
  },
  {
    title: "Founding Member badge",
    desc: `First 200 lock Progress at ${FOUNDING_PRICING.monthly}/mo or ${FOUNDING_PRICING.annual}/yr for life, plus a say in what we build next.`,
  },
] as const;

export const OFFER_FOOTNOTE =
  "Educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.";
