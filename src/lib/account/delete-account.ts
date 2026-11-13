import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelSubscriptionsForDeletion } from "@/lib/account/cancel-subscription";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Child rows first. user_profiles is deleted after these, then the auth user.
 * Tables that reference auth.users with ON DELETE CASCADE are left for that step.
 */
export const ACCOUNT_DATA_TABLES = [
  "conversation_messages",
  "conversation_sessions",
  "approval_queue",
  "financial_plans",
  "transactions",
  "document_uploads",
  "recurring_items",
  "goals",
  "net_worth_snapshots",
  "user_achievements",
  "budget_plan_entries",
  "budget_plan_schedules",
  "user_categories",
  "balance_checks",
  "cash_anchors",
  "spending_baselines",
  "ai_usage_events",
  "health_score_history",
  "category_budgets",
  "investment_holdings",
  "risk_profiles",
  "fixed_assets",
  "financial_profiles",
  "household_members",
] as const;

async function removeStoragePrefix(supabase: SupabaseClient, prefix: string) {
  const bucket = supabase.storage.from("documents");
  const { data, error } = await bucket.list(prefix, { limit: 1000 });
  if (error) {
    if (/not found|bucket/i.test(error.message)) return;
    throw new Error("storage");
  }
  const paths = (data ?? [])
    .filter((file) => file.id && file.name)
    .map((file) => `${prefix}/${file.name}`);
  if (paths.length === 0) return;
  const removed = await bucket.remove(paths);
  if (removed.error) throw new Error("storage");
}

async function cancelStripeBilling(
  subscriptionId: string | null,
  customerId: string | null,
): Promise<void> {
  if (!subscriptionId && !customerId) return;
  const { stripe } = await import("@/lib/stripe/client");
  await cancelSubscriptionsForDeletion({
    subscriptionId,
    customerId,
    listByCustomer: async (id) => {
      const found: Array<{ id: string; status: string }> = [];
      let startingAfter: string | undefined;
      for (let page = 0; page < 10; page++) {
        const result = await stripe.subscriptions.list({
          customer: id,
          status: "all",
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        for (const subscription of result.data) {
          found.push({ id: subscription.id, status: subscription.status });
        }
        if (!result.has_more || result.data.length === 0) return found;
        const last = result.data[result.data.length - 1];
        if (!last) return found;
        startingAfter = last.id;
      }
      throw new Error("stripe");
    },
    cancel: async (id) => {
      await stripe.subscriptions.cancel(id, { prorate: false, invoice_now: false });
    },
  });
}

export async function deleteAccountData(userId: string, email: string | null): Promise<void> {
  const supabase = createServiceClient();

  const { data: profile, error: billingLookupError } = await supabase
    .from("user_profiles")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (billingLookupError) throw new Error("user_profiles");

  await cancelStripeBilling(
    profile?.stripe_subscription_id ?? null,
    profile?.stripe_customer_id ?? null,
  );

  await removeStoragePrefix(supabase, `statements/${userId}`);
  await removeStoragePrefix(supabase, `spending/${userId}`);

  for (const table of ACCOUNT_DATA_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(table);
  }

  if (email) {
    const { error } = await supabase.from("waitlist_signups").delete().eq("email", email);
    if (error) throw new Error("waitlist_signups");
  }

  const { error: profileError } = await supabase.from("user_profiles").delete().eq("id", userId);
  if (profileError) throw new Error("user_profiles");

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw new Error("auth");
}
