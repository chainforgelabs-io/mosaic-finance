import type { Tier } from "@/types";

/** Monthly vs annual display (annual prices are yearly totals, billed annually). */
export type BillingInterval = "monthly" | "annual";

export type PaidTier = "progress" | "mastery";

export const TIER_LABELS: Record<Tier, string> = {
  pulse: "Pulse",
  progress: "Progress",
  mastery: "Mastery",
};

export const TIER_PROMISE: Record<Tier, string> = {
  pulse: "See where you stand — and stay consistent.",
  progress: "Know exactly what to do next.",
  mastery: "Don't just know — do it, with people who are doing it too.",
};

/** Canonical display prices (CAD). Stripe amounts come from env price IDs. */
export const TIER_PRICING: Record<Tier, { monthly: string; annual: string }> = {
  pulse: { monthly: "$0", annual: "$0" },
  progress: { monthly: "$17", annual: "$170" },
  mastery: { monthly: "$44", annual: "$350" },
};

export const FOUNDING_PRICING = {
  monthly: "$8",
  annual: "$80",
} as const;

export const ACADEMY_PRICING = {
  monthly: "$26",
  annual: "$260",
} as const;

export const TIER_FEATURES: Record<Tier, string[]> = {
  pulse: [
    "Spending tracker, budgets, net worth, and goals",
    "Live Financial Health Score + streaks",
    "Canadian calculators and newsletter",
    "14-day reverse trial of Progress — no credit card",
  ],
  progress: [
    "Everything in Pulse",
    "Full conversational fact-find",
    "8-section Progress Report + PDF, monthly refresh",
    "Charlie, your AI money guide, included",
    "Statement and receipt parsing",
  ],
  mastery: [
    "Everything in Progress",
    "Mosaic Money Club community",
    "Quarterly guided check-ins",
    "Priority report generation",
    "Tax Year-End Pack",
    "Mosaic Academy included on annual",
  ],
};

export const TIER_CTA: Record<Tier, string> = {
  pulse: "Start Free",
  progress: "Get Started",
  mastery: "Get Started",
};

/** Full price label for subscription cards (e.g. "$17/mo", "$170/yr", "$0"). */
export function formatTierPrice(
  tier: Tier,
  interval: BillingInterval = "monthly",
  opts?: { founding?: boolean },
): string {
  if (tier === "pulse") return TIER_PRICING.pulse.monthly;
  if (opts?.founding && tier === "progress") {
    return interval === "annual"
      ? `${FOUNDING_PRICING.annual}/yr`
      : `${FOUNDING_PRICING.monthly}/mo`;
  }
  const p = TIER_PRICING[tier];
  if (interval === "annual") return `${p.annual}/yr`;
  return `${p.monthly}/mo`;
}

export function formatAcademyPrice(interval: BillingInterval = "monthly"): string {
  return interval === "annual"
    ? `${ACADEMY_PRICING.annual}/yr`
    : `${ACADEMY_PRICING.monthly}/mo`;
}
