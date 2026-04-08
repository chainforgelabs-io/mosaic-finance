import type { Tier } from "@/types";

/** Monthly vs annual display (annual prices are yearly totals, billed annually). */
export type BillingInterval = "monthly" | "annual";

/** Canonical display prices (CAD). Stripe amounts come from env price IDs. */
export const TIER_PRICING: Record<Tier, { monthly: string; annual: string }> = {
  snapshot: { monthly: "$0", annual: "$0" },
  plan: { monthly: "$17", annual: "$188" },
  advisor: { monthly: "$44", annual: "$440" },
};

/** Full price label for subscription cards (e.g. "$17/mo", "$188/yr", "$0"). */
export function formatTierPrice(
  tier: Tier,
  interval: BillingInterval = "monthly",
): string {
  const p = TIER_PRICING[tier];
  if (tier === "snapshot") return p.monthly;
  if (interval === "annual") return `${p.annual}/yr`;
  return `${p.monthly}/mo`;
}
