import type { Tier } from "@/types";

/** Card-free reverse trial of Progress after Pulse signup. */
export const TRIAL_DURATION_DAYS = 7;

/**
 * Mastery (Club, Academy, tax pack, priority, check-ins) stays in entitlements
 * and Stripe, but is not sold or shown until this flips.
 */
export const MASTERY_PUBLIC = false;

export const PUBLIC_TIERS: Tier[] = MASTERY_PUBLIC
  ? ["pulse", "progress", "mastery"]
  : ["pulse", "progress"];

/** Dashboard routes that exist in code but are not part of the launch surface. */
export const DEFERRED_DASHBOARD_PREFIXES = [
  "/dashboard/tax-pack",
  "/dashboard/academy",
  "/dashboard/money-club",
  "/dashboard/priority",
  "/dashboard/market-context",
] as const;

export const TRIAL_COPY = {
  days: `${TRIAL_DURATION_DAYS} days`,
  hyphen: `${TRIAL_DURATION_DAYS}-day`,
} as const;

export function trialEndsAtIso(from = new Date()): string {
  return new Date(
    from.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function isDeferredDashboardPath(pathname: string): boolean {
  if (MASTERY_PUBLIC) return false;
  return DEFERRED_DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Stripe checkout SKUs offered on the public site. */
export function isPublicCheckoutTier(tier: string): boolean {
  if (tier === "progress") return true;
  if (tier === "mastery" || tier === "academy") return MASTERY_PUBLIC;
  return false;
}
