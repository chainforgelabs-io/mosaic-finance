/** Statuses that will not bill again. Everything else is canceled before account deletion. */
const TERMINAL_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired"]);

export function subscriptionIdsToCancel(
  storedSubscriptionId: string | null | undefined,
  listed: Array<{ id: string; status: string }>,
): string[] {
  const ids = new Set<string>();
  for (const subscription of listed) {
    if (!TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      ids.add(subscription.id);
    }
  }

  if (storedSubscriptionId) {
    const known = listed.find((subscription) => subscription.id === storedSubscriptionId);
    if (!known || !TERMINAL_SUBSCRIPTION_STATUSES.has(known.status)) {
      ids.add(storedSubscriptionId);
    }
  }

  return [...ids];
}

export function isAlreadyGoneSubscription(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  if (code === "resource_missing") return true;
  const message = error instanceof Error ? error.message : "";
  return /no such subscription|already been canceled|already canceled/i.test(message);
}

export async function cancelSubscriptionsForDeletion(args: {
  subscriptionId: string | null;
  customerId: string | null;
  listByCustomer: (customerId: string) => Promise<Array<{ id: string; status: string }>>;
  cancel: (id: string) => Promise<void>;
}): Promise<void> {
  if (!args.subscriptionId && !args.customerId) return;

  const listed = args.customerId ? await args.listByCustomer(args.customerId) : [];
  const ids = subscriptionIdsToCancel(args.subscriptionId, listed);
  for (const id of ids) {
    try {
      await args.cancel(id);
    } catch (error) {
      if (isAlreadyGoneSubscription(error)) continue;
      throw error;
    }
  }
}
