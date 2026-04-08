import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

/** Paid subscription price IDs (monthly + annual per tier). */
export const PRICE_IDS = {
  plan: {
    monthly: process.env.STRIPE_PRICE_PLAN_MONTHLY!,
    annual: process.env.STRIPE_PRICE_PLAN_ANNUAL!,
  },
  advisor: {
    monthly: process.env.STRIPE_PRICE_ADVISOR_MONTHLY!,
    annual: process.env.STRIPE_PRICE_ADVISOR_ANNUAL!,
  },
} as const;

export type PaidTier = 'plan' | 'advisor';
export type BillingInterval = 'monthly' | 'annual';

export type SubscriptionTier = 'snapshot' | 'plan' | 'advisor';

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {};

for (const tier of ['plan', 'advisor'] as const) {
  for (const interval of ['monthly', 'annual'] as const) {
    const id = PRICE_IDS[tier][interval];
    if (id) {
      PRICE_TO_TIER[id] = tier;
    }
  }
}

export function tierFromPriceId(priceId: string): SubscriptionTier {
  return PRICE_TO_TIER[priceId] ?? 'snapshot';
}

export function priceIdForCheckout(
  tier: PaidTier,
  interval: BillingInterval,
): string {
  return PRICE_IDS[tier][interval];
}
