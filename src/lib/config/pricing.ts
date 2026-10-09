import type { Tier } from "@/types";
import { TRIAL_COPY } from "@/lib/config/launch-surface";

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
    `${TRIAL_COPY.hyphen} reverse trial of Progress — no credit card`,
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

/** Same ladder, with a CAD marker so checkout cards match the public site. */
export function formatTierPriceCad(
  tier: Tier,
  interval: BillingInterval = "monthly",
  opts?: { founding?: boolean },
): string {
  return formatTierPrice(tier, interval, opts).replace("$", "CA$");
}

export function formatAcademyPrice(interval: BillingInterval = "monthly"): string {
  return interval === "annual"
    ? `${ACADEMY_PRICING.annual}/yr`
    : `${ACADEMY_PRICING.monthly}/mo`;
}

/** Stripe unit_amount for the published CAD price. Annual figures are the yearly total. */
export function expectedPriceCents(
  tier: "progress" | "mastery" | "academy",
  interval: BillingInterval,
  founding = false,
): number {
  const label =
    tier === "academy"
      ? ACADEMY_PRICING[interval]
      : founding && tier === "progress"
        ? FOUNDING_PRICING[interval]
        : TIER_PRICING[tier][interval];
  const dollars = Number(label.replace(/[^0-9.]/g, ""));
  return Math.round(dollars * 100);
}

function amountCents(
  unitAmount: number | null | undefined,
  unitAmountDecimal?: string | null,
): number | null {
  if (typeof unitAmount === "number") return unitAmount;
  if (unitAmountDecimal == null || unitAmountDecimal === "") return null;
  const parsed = Number(unitAmountDecimal);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

type CadPriceOption = {
  unit_amount: number | null;
  unit_amount_decimal?: string | null;
};

/** True when this Stripe Price charges the published CAD amount. A CAD currency option counts when the price's default currency is something else. */
export function matchesPublishedCadAmount(
  price: {
    currency: string;
    unit_amount: number | null;
    unit_amount_decimal?: string | null;
    currency_options?: { cad?: CadPriceOption };
  },
  expectedCents: number,
): boolean {
  if (price.currency === "cad") {
    return amountCents(price.unit_amount, price.unit_amount_decimal) === expectedCents;
  }
  const cad = price.currency_options?.cad;
  if (!cad) return false;
  return amountCents(cad.unit_amount, cad.unit_amount_decimal) === expectedCents;
}
