import Stripe from "stripe";
import type { BillingInterval, PaidTier } from "@/lib/config/pricing";
import type { Tier } from "@/types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export type { PaidTier, BillingInterval };

export type PriceKind = "app" | "academy";

export interface PriceMeta {
  kind: PriceKind;
  tier: Tier;
  interval: BillingInterval;
  founding?: boolean;
  academy?: boolean;
}

function envPrice(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/** Paid subscription price IDs. Legacy PLAN/ADVISOR env names still map if present. */
export const PRICE_IDS = {
  progress: {
    monthly:
      envPrice("STRIPE_PRICE_PROGRESS_MONTHLY") ??
      envPrice("STRIPE_PRICE_PLAN_MONTHLY"),
    annual:
      envPrice("STRIPE_PRICE_PROGRESS_ANNUAL") ??
      envPrice("STRIPE_PRICE_PLAN_ANNUAL"),
    foundingMonthly: envPrice("STRIPE_PRICE_PROGRESS_FOUNDING_MONTHLY"),
    foundingAnnual: envPrice("STRIPE_PRICE_PROGRESS_FOUNDING_ANNUAL"),
  },
  mastery: {
    monthly:
      envPrice("STRIPE_PRICE_MASTERY_MONTHLY") ??
      envPrice("STRIPE_PRICE_ADVISOR_MONTHLY"),
    annual:
      envPrice("STRIPE_PRICE_MASTERY_ANNUAL") ??
      envPrice("STRIPE_PRICE_ADVISOR_ANNUAL"),
  },
  academy: {
    monthly: envPrice("STRIPE_PRICE_ACADEMY_MONTHLY"),
    annual: envPrice("STRIPE_PRICE_ACADEMY_ANNUAL"),
  },
} as const;

const PRICE_TO_META: Record<string, PriceMeta> = {};

function register(id: string | undefined, meta: PriceMeta) {
  if (id) PRICE_TO_META[id] = meta;
}

register(PRICE_IDS.progress.monthly, {
  kind: "app",
  tier: "progress",
  interval: "monthly",
});
register(PRICE_IDS.progress.annual, {
  kind: "app",
  tier: "progress",
  interval: "annual",
});
register(PRICE_IDS.progress.foundingMonthly, {
  kind: "app",
  tier: "progress",
  interval: "monthly",
  founding: true,
});
register(PRICE_IDS.progress.foundingAnnual, {
  kind: "app",
  tier: "progress",
  interval: "annual",
  founding: true,
});
register(PRICE_IDS.mastery.monthly, {
  kind: "app",
  tier: "mastery",
  interval: "monthly",
});
register(PRICE_IDS.mastery.annual, {
  kind: "app",
  tier: "mastery",
  interval: "annual",
  academy: true,
});
register(PRICE_IDS.academy.monthly, {
  kind: "academy",
  tier: "pulse",
  interval: "monthly",
  academy: true,
});
register(PRICE_IDS.academy.annual, {
  kind: "academy",
  tier: "pulse",
  interval: "annual",
  academy: true,
});

export function priceMetaFromPriceId(priceId: string): PriceMeta | null {
  return PRICE_TO_META[priceId] ?? null;
}

export function tierFromPriceId(priceId: string): Tier {
  return PRICE_TO_META[priceId]?.tier ?? "pulse";
}

export function priceIdForCheckout(
  tier: PaidTier | "academy",
  interval: BillingInterval,
  opts?: { founding?: boolean },
): string | undefined {
  if (tier === "academy") {
    return PRICE_IDS.academy[interval];
  }
  if (tier === "progress" && opts?.founding) {
    const founding =
      interval === "annual"
        ? PRICE_IDS.progress.foundingAnnual
        : PRICE_IDS.progress.foundingMonthly;
    if (founding) return founding;
  }
  return PRICE_IDS[tier][interval];
}

export async function notifySkool(email: string, level: "club" | "academy") {
  const url = process.env.SKOOL_ZAPIER_HOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, level }),
    });
  } catch (error) {
    console.error("[skool] zapier hook failed", error);
  }
}
