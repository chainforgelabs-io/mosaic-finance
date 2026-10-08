import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";

const SLUG = /^[a-z][a-z0-9_]{0,39}$/;
const MONTH = /^\d{4}-\d{2}-01$/;

const entrySchema = z.object({
  kind: z.enum(["income", "expense", "savings"]),
  category: z.string().regex(SLUG),
  month: z.string().regex(MONTH),
  amount: z.number().min(0).max(100_000_000),
});

const putSchema = z.object({
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
});

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

  return NextResponse.json({
    entries: (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })),
    hasAnyPlan: (count ?? 0) > 0,
  });
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

  const unlocks = await awardForEvent(supabase, user.id, { budgetJustSet: true });
  const gamification = await getGamificationSummary(supabase, user.id, unlocks);

  return NextResponse.json({ ok: true, gamification });
}
