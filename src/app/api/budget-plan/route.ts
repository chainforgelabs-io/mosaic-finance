import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";
import { SPENDING_CATEGORIES } from "@/lib/tracking/categories";

const SLUG = /^[a-z][a-z0-9_]{0,39}$/;
const MONTH = /^\d{4}-\d{2}-01$/;

const entrySchema = z.object({
  kind: z.enum(["income", "expense", "savings"]),
  category: z.string().regex(SLUG),
  month: z.string().regex(MONTH),
  amount: z.number().min(0).max(100_000_000),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const scheduleSchema = z.object({
  kind: z.enum(["income", "expense", "savings"]),
  category: z.string().regex(SLUG),
  amount: z.number().min(0).max(100_000_000),
  basis: z.enum(["each", "year"]),
  cadence: z
    .enum(["weekly", "biweekly", "semimonthly", "monthly", "quarterly", "every4months", "semiannual", "yearly"])
    .nullable(),
  anchor_date: z.string().regex(ISO_DATE).nullable(),
  spend_category: z.enum(SPENDING_CATEGORIES).nullable().optional(),
});

const putSchema = z.object({
  /** True when the person built this plan themselves, so it does not wait for a confirm. */
  reviewed: z.boolean().optional(),
  entries: z.array(entrySchema).max(2000),
  /** Rows to remove, for example when a category is taken out of the plan. */
  remove: z
    .array(
      z.object({
        kind: z.enum(["income", "expense", "savings"]),
        category: z.string().regex(SLUG),
        /** When omitted, every month for that row is removed. */
        month: z.string().regex(MONTH).optional(),
      }),
    )
    .max(200)
    .optional(),
  schedules: z.array(scheduleSchema).max(200).optional(),
});

function missingScheduleTable(message: string): boolean {
  return /budget_plan_schedules|does not exist|schema cache/i.test(message);
}

function missingSpendColumn(message: string): boolean {
  return /spend_category/i.test(message);
}

function missingReviewColumn(message: string): boolean {
  return /cash_flow_reviewed_at/i.test(message);
}

/** Missing column counts as already confirmed, so the app works before the migration. */
async function stampCashFlowReviewed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<"ok" | "missing" | "error"> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ cash_flow_reviewed_at: new Date().toISOString() })
    .eq("id", userId);
  if (!error) return "ok";
  if (missingReviewColumn(error.message)) return "missing";
  return "error";
}

async function cashFlowReviewed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("cash_flow_reviewed_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) return true;
  return Boolean(data?.cash_flow_reviewed_at);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const yearRaw = searchParams.get("year");
  const year = yearRaw ? Number(yearRaw) : null;

  let query = supabase
    .from("budget_plan_entries")
    .select("kind, category, month, amount")
    .eq("user_id", user.id)
    .order("month", { ascending: true });

  if (year && Number.isInteger(year) && year >= 2000 && year <= 2100) {
    query = query.gte("month", `${year}-01-01`).lte("month", `${year}-12-01`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });

  const { count } = await supabase
    .from("budget_plan_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const withGroup = await supabase
    .from("budget_plan_schedules")
    .select("kind, category, amount, basis, cadence, anchor_date, spend_category")
    .eq("user_id", user.id);
  const scheduleSelect =
    withGroup.error && missingSpendColumn(withGroup.error.message)
      ? await supabase
          .from("budget_plan_schedules")
          .select("kind, category, amount, basis, cadence, anchor_date")
          .eq("user_id", user.id)
      : withGroup;
  const schedules =
    scheduleSelect.error && missingScheduleTable(scheduleSelect.error.message)
      ? []
      : scheduleSelect.error
        ? null
        : (scheduleSelect.data ?? []).map((row) => ({
            kind: row.kind,
            category: row.category,
            amount: Number(row.amount),
            basis: row.basis,
            cadence: row.cadence,
            anchor_date: row.anchor_date,
            spend_category: "spend_category" in row ? row.spend_category : null,
          }));
  if (schedules == null) return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });

  return NextResponse.json({
    entries: (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })),
    hasAnyPlan: (count ?? 0) > 0,
    schedules,
    reviewed: await cashFlowReviewed(supabase, user.id),
  });
}

const patchSchema = z.object({
  reviewed: z.literal(true),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const stamped = await stampCashFlowReviewed(supabase, user.id);
  if (stamped === "error") return NextResponse.json({ error: "Failed to confirm plan" }, { status: 500 });
  return NextResponse.json({ reviewed: true });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  for (const target of parsed.data.remove ?? []) {
    let remove = supabase
      .from("budget_plan_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", target.kind)
      .eq("category", target.category);
    if (target.month) remove = remove.eq("month", target.month);
    const { error } = await remove;
    if (error) return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    if (!target.month) {
      const dropped = await supabase
        .from("budget_plan_schedules")
        .delete()
        .eq("user_id", user.id)
        .eq("kind", target.kind)
        .eq("category", target.category);
      if (dropped.error && !missingScheduleTable(dropped.error.message)) {
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
      }
    }
  }

  if (parsed.data.entries.length > 0) {
    const rows = parsed.data.entries.map((entry) => ({
      user_id: user.id,
      kind: entry.kind,
      category: entry.category,
      month: entry.month,
      amount: entry.amount,
    }));
    const { error } = await supabase.from("budget_plan_entries").upsert(rows, {
      onConflict: "user_id,kind,category,month",
    });
    if (error) return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }

  let schedulesSaved = true;
  if ((parsed.data.schedules ?? []).length > 0) {
    const rows = parsed.data.schedules!.map((schedule) => ({
      user_id: user.id,
      kind: schedule.kind,
      category: schedule.category,
      amount: schedule.amount,
      basis: schedule.basis,
      cadence: schedule.cadence,
      anchor_date: schedule.anchor_date,
      spend_category: schedule.kind === "expense" ? schedule.spend_category ?? null : null,
    }));
    let { error } = await supabase.from("budget_plan_schedules").upsert(rows, {
      onConflict: "user_id,kind,category",
    });
    if (error && missingSpendColumn(error.message)) {
      const withoutGroup = rows.map((row) => ({
        user_id: row.user_id,
        kind: row.kind,
        category: row.category,
        amount: row.amount,
        basis: row.basis,
        cadence: row.cadence,
        anchor_date: row.anchor_date,
      }));
      const retry = await supabase.from("budget_plan_schedules").upsert(withoutGroup, {
        onConflict: "user_id,kind,category",
      });
      error = retry.error;
      schedulesSaved = false;
    }
    if (error) {
      if (missingScheduleTable(error.message)) schedulesSaved = false;
      else return NextResponse.json({ error: "Failed to save plan schedule" }, { status: 500 });
    }
  }

  if (parsed.data.reviewed) {
    // The rows are already saved. A failed stamp leaves the confirm banner up on the next load.
    await stampCashFlowReviewed(supabase, user.id);
  }

  const unlocks = await awardForEvent(supabase, user.id, { budgetJustSet: true });
  const gamification = await getGamificationSummary(supabase, user.id, unlocks);

  return NextResponse.json({ ok: true, gamification, schedulesSaved });
}
