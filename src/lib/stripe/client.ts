import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export const PRICE_IDS = {
  essential: process.env.STRIPE_PRICE_ESSENTIAL!,
  pro: process.env.STRIPE_PRICE_PRO!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
} as const;

export type SubscriptionTier = 'free' | 'essential' | 'pro' | 'premium';

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [PRICE_IDS.essential]: 'essential',
  [PRICE_IDS.pro]: 'pro',
  [PRICE_IDS.premium]: 'premium',
};

export function tierFromPriceId(priceId: string): SubscriptionTier {
  return PRICE_TO_TIER[priceId] ?? 'free';
}
