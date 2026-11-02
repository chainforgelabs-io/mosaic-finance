import { categoryKind, categorySlug, SPENDING_CATEGORIES } from "@/lib/tracking/categories";
import { startOfMonth, todayIso } from "@/lib/tracking/dates";
import { saveCategory, savePlan } from "@/lib/tracking/plan-client";

export interface CreatedSavingsAccount {
  id: string;
  slug: string;
  name: string;
}

/** A slug that stays a savings line, even when the name matches an expense category. */
export function savingsSlug(label: string): string | null {
  const slug = categorySlug(label);
  if (!slug) return null;
  const kind = categoryKind(slug);
  const builtInSpend = (SPENDING_CATEGORIES as readonly string[]).includes(slug);
  if (kind === "savings") return slug;
  if (kind === "income" || builtInSpend) {
    const next = `${slug}_savings`.slice(0, 40);
    return /^[a-z][a-z0-9_]{0,39}$/.test(next) ? next : null;
  }
  return slug;
}

/**
 * Add a named bank account on Net Worth and a savings line with the same name on Cash Flow.
 * Logged savings use that line. The goal reads the check-in balance, not the sum of both.
 */
export async function createSavingsAccount(label: string): Promise<CreatedSavingsAccount | null> {
  const name = label.trim();
  const slug = savingsSlug(name);
  if (!slug) return null;

  const holdingRes = await fetch("/api/holdings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ display_name: name }),
  });
  if (!holdingRes.ok) return null;
  const json = await holdingRes.json();
  const id = json.holding?.id as string | undefined;
  if (!id) return null;

  await saveCategory({ slug, label: name, kind: "savings" });
  await savePlan([{ kind: "savings", category: slug, month: startOfMonth(todayIso()), amount: 0 }]);
  return { id, slug, name };
}
