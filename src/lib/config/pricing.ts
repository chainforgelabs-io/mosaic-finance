import type { Tier } from "@/types";

/** Canonical display prices (CAD). Stripe amounts come from env price IDs. */
export const TIER_PRICING: Record<Tier, { price: string; period: string }> = {
  free: { price: "$0", period: "" },
  essential: { price: "$19", period: "/mo" },
  pro: { price: "$39", period: "/mo" },
  premium: { price: "$79", period: "/mo" },
};

/** Full price label for subscription cards (e.g. "$19/mo", "$0"). */
export function formatTierPrice(tier: Tier): string {
  const { price, period } = TIER_PRICING[tier];
  if (!period) return price;
  return `${price}${period}`;
}
