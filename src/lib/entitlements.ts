import { NextResponse } from "next/server";
import type { Tier } from "@/types";
import { createServiceClient } from "@/lib/supabase/service";

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
        ? { kind: "messages", limit: 100 }
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
    "Charlie is included on Progress and Mastery. Start a 14-day reverse trial or upgrade to keep talking.",
  report:
    "Progress Reports are included on Progress and Mastery. Upgrade to generate yours.",
  parse:
    "Statement and receipt parsing is included on Progress and Mastery.",
  taxPack: "The Tax Year-End Pack is a Mastery benefit.",
  club: "The Mosaic Money Club is included with Mastery.",
  charlieCap:
    "You've used a lot of Charlie this month. We'll keep the conversation going — consider Mastery if you want unlimited check-ins.",
  reportCap:
    "You've already regenerated your Progress Report this month. It refreshes again next month on Progress, or anytime on Mastery.",
} as const;

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

export async function loadProfileEntitlements(userId: string): Promise<Entitlements> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_profiles")
    .select(
      "subscription_tier, trial_ends_at, academy_access, subscription_interval, is_founding_member",
    )
    .eq("id", userId)
    .maybeSingle();
  return resolveEntitlements(data);
}
