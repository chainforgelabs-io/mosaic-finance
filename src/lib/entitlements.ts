import { NextResponse } from "next/server";
import type { Tier } from "@/types";
import { createServiceClient } from "@/lib/supabase/service";
import { TRIAL_COPY, trialEndsAtIso } from "@/lib/config/launch-surface";

export type PaidTier = "progress" | "mastery";

export type UsageKind = "message" | "report" | "upload" | "commentary";

export interface ProfileForEntitlements {
  subscription_tier?: string | null;
  trial_ends_at?: string | null;
  academy_access?: boolean | null;
  subscription_interval?: string | null;
  is_founding_member?: boolean | null;
}

export interface Entitlements {
  storedTier: Tier;
  effectiveTier: Tier;
  trialActive: boolean;
  trialEndsAt: string | null;
  isFoundingMember: boolean;
  canUseCharlie: boolean;
  canGenerateReport: boolean;
  canParseUploads: boolean;
  hasTaxPack: boolean;
  hasClub: boolean;
  hasAcademy: boolean;
  /** Soft cap: Progress meters messages; Mastery meters conversations. */
  charlieSoftCap: { kind: "messages" | "conversations"; limit: number } | null;
  reportRegenCap: number | null;
}

/** Progress and trial Charlie replies per calendar month. Not shown in product copy. */
export const PROGRESS_CHARLIE_MESSAGE_CAP = 200;

/** Notice appears once this share of the monthly allowance is used. */
const CHARLIE_APPROACH_RATIO = 0.8;

/** Claude switches to a remaining-count once only a handful of messages are left. */
const CHARLIE_REMAINING_NOTICE_AT = 5;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const LEGACY_TIER: Record<string, Tier> = {
  snapshot: "pulse",
  plan: "progress",
  advisor: "mastery",
  pulse: "pulse",
  progress: "progress",
  mastery: "mastery",
};

export function normalizeTier(value: string | null | undefined): Tier {
  if (!value) return "pulse";
  return LEGACY_TIER[value] ?? "pulse";
}

export function isTrialActive(trialEndsAt: string | null | undefined, now = new Date()): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > now.getTime();
}

export function resolveEntitlements(
  profile: ProfileForEntitlements | null | undefined,
  now = new Date(),
): Entitlements {
  const storedTier = normalizeTier(profile?.subscription_tier);
  const trialActive = storedTier === "pulse" && isTrialActive(profile?.trial_ends_at, now);
  const effectiveTier: Tier = trialActive ? "progress" : storedTier;
  const paid = effectiveTier !== "pulse";
  const mastery = effectiveTier === "mastery";
  const annual = profile?.subscription_interval === "annual";

  return {
    storedTier,
    effectiveTier,
    trialActive,
    trialEndsAt: profile?.trial_ends_at ?? null,
    isFoundingMember: Boolean(profile?.is_founding_member),
    canUseCharlie: paid,
    canGenerateReport: paid,
    canParseUploads: paid,
    hasTaxPack: mastery,
    hasClub: mastery,
    hasAcademy: Boolean(profile?.academy_access) || (mastery && annual),
    charlieSoftCap: mastery
      ? { kind: "conversations", limit: 100 }
      : paid
        ? { kind: "messages", limit: PROGRESS_CHARLIE_MESSAGE_CAP }
        : null,
    reportRegenCap: mastery ? null : paid ? 1 : 0,
  };
}

export function entitlementDenied(reason: string, message: string) {
  return NextResponse.json(
    {
      error: message,
      code: "UPGRADE_REQUIRED",
      reason,
    },
    { status: 402 },
  );
}

export const ENTITLEMENT_COPY = {
  charlie:
    `Charlie is included on Progress. Start a ${TRIAL_COPY.hyphen} reverse trial or upgrade to keep talking.`,
  report:
    "Progress Reports are included on Progress. Upgrade to generate yours.",
  parse: "Statement and receipt parsing is included on Progress.",
  taxPack: "The Tax Year-End Pack is a Mastery benefit.",
  checkIn: "Quarterly guided check-ins are included with Mastery.",
  club: "The Mosaic Money Club is included with Mastery.",
  charlieCap:
    "You've reached Charlie's limit for this month.",
  reportCap:
    "Your Progress Report for this month is already in. It refreshes again next month on Progress.",
} as const;

/** First day of next month in UTC, matching the usage counter. */
export function charlieUsageResetLabel(now = new Date()): string {
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return `${MONTHS[reset.getUTCMonth()]} ${reset.getUTCDate()}`;
}

/**
 * In-chat notice only. Null until the user is close, so the allowance is never
 * announced up front. Wording follows Claude: a percent, then a remaining count,
 * then a reset line at the limit. The allowance size is not included.
 */
export function charlieMessageUsageNotice(
  used: number,
  limit: number,
  now = new Date(),
): string | null {
  if (limit <= 0 || used <= 0) return null;
  const remaining = Math.max(0, limit - used);
  const reset = charlieUsageResetLabel(now);
  if (remaining === 0) {
    return `You've reached Charlie's limit for this month. It resets ${reset}.`;
  }
  if (remaining <= CHARLIE_REMAINING_NOTICE_AT) {
    const noun = remaining === 1 ? "message" : "messages";
    return `${remaining} ${noun} remaining until ${reset}.`;
  }
  if (used / limit >= CHARLIE_APPROACH_RATIO) {
    const pct = Math.floor((used / limit) * 100);
    return `You've used ${pct}% of Charlie this month. It resets ${reset}.`;
  }
  return null;
}

function startOfMonthIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function countUsageThisMonth(
  userId: string,
  kind: UsageKind,
  now = new Date(),
): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", startOfMonthIso(now));

  if (error) {
    console.error("[entitlements] usage count failed", error);
    return 0;
  }
  return count ?? 0;
}

export async function countConversationsThisMonth(
  userId: string,
  now = new Date(),
): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("conversation_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonthIso(now));

  if (error) {
    console.error("[entitlements] conversation count failed", error);
    return 0;
  }
  return count ?? 0;
}

export async function recordUsageEvent(event: {
  userId: string;
  kind: UsageKind;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  sessionId?: string;
}) {
  try {
    const supabase = createServiceClient();
    await supabase.from("ai_usage_events").insert({
      user_id: event.userId,
      kind: event.kind,
      model: event.model ?? null,
      input_tokens: event.inputTokens ?? 0,
      output_tokens: event.outputTokens ?? 0,
      cache_read_tokens: event.cacheReadTokens ?? 0,
      session_id: event.sessionId ?? null,
    });
  } catch (error) {
    console.error("[entitlements] recordUsageEvent failed", error);
  }
}

/**
 * A Pulse account with no Stripe subscription and no trial timestamp never
 * received the signup trial. An expired trial has a timestamp and is left alone.
 */
export function signupTrialMissing(
  profile: {
    subscription_tier?: string | null;
    trial_ends_at?: string | null;
    stripe_subscription_id?: string | null;
  } | null,
): boolean {
  if (!profile) return true;
  if (profile.stripe_subscription_id) return false;
  if (normalizeTier(profile.subscription_tier) !== "pulse") return false;
  return profile.trial_ends_at == null;
}

export async function loadProfileEntitlements(
  userId: string,
  email?: string | null,
): Promise<Entitlements> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_profiles")
    .select(
      "subscription_tier, trial_ends_at, academy_access, subscription_interval, is_founding_member, stripe_subscription_id",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!signupTrialMissing(data)) {
    return resolveEntitlements(data);
  }

  const trialEndsAt = trialEndsAtIso();
  if (!data) {
    const { error } = await supabase.from("user_profiles").insert({
      id: userId,
      alias: email?.split("@")[0] || `user_${userId.slice(0, 6)}`,
      subscription_tier: "pulse",
      trial_ends_at: trialEndsAt,
      email: email ?? null,
    });
    if (!error) {
      return resolveEntitlements({
        subscription_tier: "pulse",
        trial_ends_at: trialEndsAt,
      });
    }
    console.error("[entitlements] signup profile insert failed", error);
    return resolveEntitlements(null);
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ trial_ends_at: trialEndsAt })
    .eq("id", userId)
    .is("trial_ends_at", null);
  if (error) {
    console.error("[entitlements] signup trial update failed", error);
    return resolveEntitlements(data);
  }
  return resolveEntitlements({ ...data, trial_ends_at: trialEndsAt });
}
