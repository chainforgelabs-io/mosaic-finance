import type { SupabaseClient } from "@supabase/supabase-js";
import { awardForEvent } from "@/lib/gamification/award";
import { entriesFromSchedules } from "@/lib/tracking/budget-plan";
import {
  customCashFlowCategories,
  linesNotAlreadyPlanned,
  type CashFlowLine,
} from "@/lib/tracking/fact-find-cash-flow";
import { torontoDate } from "@/lib/tracking/net-worth-reminder";

function missingPlanTable(message: string | undefined): boolean {
  return /budget_plan_schedules|budget_plan_entries|user_categories|does not exist|schema cache/i.test(
    message ?? "",
  );
}

/**
 * Write confirmed fact-find lines into the cash-flow plan.
 * A category that already has a schedule or a plan row is left as the person edited it.
 */
export async function seedFactFindCashFlow(
  supabase: SupabaseClient,
  userId: string,
  lines: CashFlowLine[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (lines.length === 0) return { ok: true };

  const [schedulesRes, entriesRes] = await Promise.all([
    supabase.from("budget_plan_schedules").select("kind, category").eq("user_id", userId),
    supabase.from("budget_plan_entries").select("kind, category").eq("user_id", userId),
  ]);
  if (schedulesRes.error && !missingPlanTable(schedulesRes.error.message)) {
    return { ok: false, error: "Failed to read cash-flow plan" };
  }
  if (entriesRes.error && !missingPlanTable(entriesRes.error.message)) {
    return { ok: false, error: "Failed to read cash-flow plan" };
  }
  if (schedulesRes.error || entriesRes.error) {
    console.warn("[financial-profile] cash-flow plan tables missing");
    return { ok: true };
  }

  const taken = [...(schedulesRes.data ?? []), ...(entriesRes.data ?? [])].map(
    (row) => `${row.kind}|${row.category}`,
  );
  const fresh = linesNotAlreadyPlanned(lines, taken);
  if (fresh.length === 0) return { ok: true };

  const custom = customCashFlowCategories(fresh);
  if (custom.length > 0) {
    const { error } = await supabase.from("user_categories").upsert(
      custom.map((line) => ({
        user_id: userId,
        slug: line.category,
        label: line.label,
        kind: line.kind,
        is_need: false,
        sort_order: 0,
        archived: false,
      })),
      { onConflict: "user_id,slug" },
    );
    if (error && !missingPlanTable(error.message)) {
      return { ok: false, error: "Failed to save cash-flow categories" };
    }
  }

  const year = Number(torontoDate().slice(0, 4));
  const schedules = fresh.map((line) => ({
    kind: line.kind,
    category: line.category,
    amount: line.monthly_amount,
    basis: "each" as const,
    cadence: null,
    anchor_date: null,
    spend_category: line.kind === "expense" ? line.category : null,
  }));
  const entries = entriesFromSchedules(schedules, year).map((entry) => ({
    user_id: userId,
    kind: entry.kind,
    category: entry.category,
    month: entry.month,
    amount: entry.amount,
  }));
  if (entries.length === 0) return { ok: true };

  const savedEntries = await supabase.from("budget_plan_entries").upsert(entries, {
    onConflict: "user_id,kind,category,month",
  });
  if (savedEntries.error) {
    if (missingPlanTable(savedEntries.error.message)) return { ok: true };
    return { ok: false, error: "Failed to save cash-flow plan" };
  }

  const scheduleRows = schedules.map((row) => ({ user_id: userId, ...row }));
  let savedSchedules = await supabase.from("budget_plan_schedules").upsert(scheduleRows, {
    onConflict: "user_id,kind,category",
  });
  if (savedSchedules.error && /spend_category/i.test(savedSchedules.error.message)) {
    const withoutGroup = scheduleRows.map((row) => ({
      user_id: row.user_id,
      kind: row.kind,
      category: row.category,
      amount: row.amount,
      basis: row.basis,
      cadence: row.cadence,
      anchor_date: row.anchor_date,
    }));
    savedSchedules = await supabase.from("budget_plan_schedules").upsert(withoutGroup, {
      onConflict: "user_id,kind,category",
    });
  }
  if (savedSchedules.error && !missingPlanTable(savedSchedules.error.message)) {
    return { ok: false, error: "Failed to save cash-flow plan" };
  }

  try {
    await awardForEvent(supabase, userId, { budgetJustSet: true });
  } catch (error) {
    console.warn("[financial-profile] cash-flow achievement skipped", error);
  }
  return { ok: true };
}
