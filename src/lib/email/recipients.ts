import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/lib/config/profile-mappings";
import { normalizeEmail } from "@/lib/email/unsubscribe";
import type { NotificationPreferences } from "@/types";

export interface Recipient {
  email: string;
  userId?: string;
  source: "user" | "waitlist";
}

function prefsOf(raw: unknown): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw as Partial<NotificationPreferences> | null | undefined),
  };
}

export async function loadAuthEmailSet(): Promise<Set<string>> {
  const supabase = createServiceClient();
  const emails = new Set<string>();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    for (const user of data.users) {
      if (user.email) emails.add(normalizeEmail(user.email));
    }
    if (data.users.length < 200) break;
  }
  return emails;
}

export async function collectMarketRecipients(): Promise<Recipient[]> {
  const supabase = createServiceClient();
  const byEmail = new Map<string, Recipient>();

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email, notification_preferences");

  const missingEmail: string[] = [];
  for (const row of profiles ?? []) {
    const prefs = prefsOf(row.notification_preferences);
    if (prefs.weekly_market === false) continue;
    if (row.email) {
      const email = normalizeEmail(row.email as string);
      byEmail.set(email, { email, userId: row.id, source: "user" });
    } else {
      missingEmail.push(row.id);
    }
  }

  for (const id of missingEmail) {
    const { data } = await supabase.auth.admin.getUserById(id);
    const email = data.user?.email ? normalizeEmail(data.user.email) : null;
    if (!email) continue;
    byEmail.set(email, { email, userId: id, source: "user" });
    await supabase.from("user_profiles").update({ email }).eq("id", id);
  }

  const { data: waitlist } = await supabase
    .from("waitlist_signups")
    .select("email")
    .eq("newsletter_opt_in", true)
    .is("unsubscribed_at", null);

  const accounts = await loadAuthEmailSet();
  for (const row of waitlist ?? []) {
    if (!row.email) continue;
    const email = normalizeEmail(row.email);
    if (accounts.has(email) || byEmail.has(email)) continue;
    byEmail.set(email, { email, source: "waitlist" });
  }

  return [...byEmail.values()];
}

export async function collectEducationRecipients(): Promise<Recipient[]> {
  const supabase = createServiceClient();
  const byEmail = new Map<string, Recipient>();

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email, notification_preferences, last_education_email_at");

  const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const missingEmail: { id: string }[] = [];

  for (const row of profiles ?? []) {
    const prefs = prefsOf(row.notification_preferences);
    if (prefs.education_emails === false) continue;
    const last = row.last_education_email_at
      ? new Date(row.last_education_email_at as string).getTime()
      : 0;
    if (last > tenDaysAgo) continue;
    if (row.email) {
      const email = normalizeEmail(row.email as string);
      byEmail.set(email, { email, userId: row.id, source: "user" });
    } else {
      missingEmail.push({ id: row.id });
    }
  }

  for (const { id } of missingEmail) {
    const { data } = await supabase.auth.admin.getUserById(id);
    const email = data.user?.email ? normalizeEmail(data.user.email) : null;
    if (!email) continue;
    byEmail.set(email, { email, userId: id, source: "user" });
    await supabase.from("user_profiles").update({ email }).eq("id", id);
  }

  const { data: waitlist } = await supabase
    .from("waitlist_signups")
    .select("email, nurture_step")
    .eq("newsletter_opt_in", true)
    .is("unsubscribed_at", null)
    .is("converted_at", null)
    .gte("nurture_step", 5);

  const accounts = await loadAuthEmailSet();
  for (const row of waitlist ?? []) {
    if (!row.email) continue;
    const email = normalizeEmail(row.email);
    if (accounts.has(email) || byEmail.has(email)) continue;
    byEmail.set(email, { email, source: "waitlist" });
  }

  return [...byEmail.values()];
}

export async function markWaitlistConverted(email: string | null | undefined): Promise<void> {
  if (!email) return;
  const supabase = createServiceClient();
  await supabase
    .from("waitlist_signups")
    .update({
      converted_at: new Date().toISOString(),
      nurture_step: 5,
    })
    .eq("email", normalizeEmail(email))
    .is("converted_at", null);
}

export async function emailHasAccount(email: string): Promise<boolean> {
  const supabase = createServiceClient();
  const normalized = normalizeEmail(email);
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (profile) return true;
  const accounts = await loadAuthEmailSet();
  return accounts.has(normalized);
}
