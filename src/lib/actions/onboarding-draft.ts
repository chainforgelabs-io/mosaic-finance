"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveFactFindSession } from "@/lib/conversation/fact-find-session";
import { mergeOnboardingDraft, readOnboardingDraft, type OnboardingDraft } from "@/lib/onboarding/draft";

export async function getOnboardingDraft(): Promise<OnboardingDraft> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const session = await resolveFactFindSession(supabase, user.id);
  if (!session) return {};
  return readOnboardingDraft(session.metadata);
}

export async function saveOnboardingDraft(
  partial: Partial<Record<keyof OnboardingDraft, unknown>>,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const session = await resolveFactFindSession(supabase, user.id);
  if (!session) return;

  const { data: fresh } = await supabase
    .from("conversation_sessions")
    .select("metadata")
    .eq("id", session.id)
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase
    .from("conversation_sessions")
    .update({
      metadata: mergeOnboardingDraft(fresh?.metadata ?? session.metadata, partial),
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("user_id", user.id);
}
