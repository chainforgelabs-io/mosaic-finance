import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/lib/config/profile-mappings";
import type { NotificationPreferences } from "@/types";

export type EmailList = "market" | "education" | "all";

interface UnsubscribePayload {
  email: string;
  list: EmailList;
  v: 1;
}

export interface UnsubscribeResult {
  ok: boolean;
  email?: string;
  list?: EmailList;
  error?: string;
}

function secret(): string {
  const value = process.env.CRON_SECRET;
  if (!value) {
    throw new Error("CRON_SECRET is required to sign unsubscribe tokens.");
  }
  return value;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function signUnsubscribeToken(email: string, list: EmailList): string {
  const payload: UnsubscribePayload = {
    email: normalizeEmail(email),
    list,
    v: 1,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  try {
    const trimmed = token.trim();
    const dot = trimmed.lastIndexOf(".");
    if (dot <= 0) return null;
    const encoded = trimmed.slice(0, dot);
    const sig = trimmed.slice(dot + 1);
    const expected = createHmac("sha256", secret()).update(encoded).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as UnsubscribePayload;
    if (parsed.v !== 1 || !parsed.email || !parsed.list) return null;
    if (parsed.list !== "market" && parsed.list !== "education" && parsed.list !== "all") {
      return null;
    }
    return { ...parsed, email: normalizeEmail(parsed.email) };
  } catch {
    return null;
  }
}

export function unsubscribeUrl(email: string, list: EmailList): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";
  const token = signUnsubscribeToken(email, list);
  return `${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function unsubscribeApiUrl(email: string, list: EmailList): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";
  const token = signUnsubscribeToken(email, list);
  return `${appUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

function prefsAfterUnsubscribe(
  prev: Partial<NotificationPreferences> | null | undefined,
  list: EmailList,
): NotificationPreferences {
  const merged: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...prev,
  };
  if (list === "market") {
    merged.weekly_market = false;
  } else if (list === "education") {
    merged.education_emails = false;
  } else {
    merged.weekly_market = false;
    merged.education_emails = false;
    merged.quarterly_replan = false;
  }
  return merged;
}

export async function applyUnsubscribe(
  email: string,
  list: EmailList,
): Promise<UnsubscribeResult> {
  const normalized = normalizeEmail(email);
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const waitlistUpdate: Record<string, unknown> = {};
  if (list === "market" || list === "education" || list === "all") {
    waitlistUpdate.newsletter_opt_in = false;
  }
  if (list === "all") {
    waitlistUpdate.unsubscribed_at = now;
    waitlistUpdate.nurture_step = 5;
  }
  if (Object.keys(waitlistUpdate).length > 0) {
    await supabase
      .from("waitlist_signups")
      .update(waitlistUpdate)
      .eq("email", normalized);
  }

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, notification_preferences")
    .eq("email", normalized);

  for (const row of profiles ?? []) {
    const next = prefsAfterUnsubscribe(
      row.notification_preferences as Partial<NotificationPreferences> | null,
      list,
    );
    await supabase
      .from("user_profiles")
      .update({ notification_preferences: next })
      .eq("id", row.id);
  }

  return { ok: true, email: normalized, list };
}
