import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";
import { recordDerivedHealthScore } from "@/lib/health-score/record";
import { createClient } from "@/lib/supabase/server";
import { advanceRecurringDate, type RecurringCadence } from "@/lib/tracking/cash-capture";

const slug = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cadence = z.enum(["weekly", "biweekly", "monthly"]);

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.number().min(0),
  category: slug,
  direction: z.enum(["in", "out"]).default("out"),
  cadence,
  next_date: iso,
});

const patchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["confirm", "skip", "update"]).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  amount: z.number().min(0).optional(),
  category: slug.optional(),
  direction: z.enum(["in", "out"]).optional(),
  cadence: cadence.optional(),
  next_date: iso.optional(),
  active: z.boolean().optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("recurring_items")
    .select("id, name, amount, category, direction, cadence, next_date, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("next_date", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load schedules" }, { status: 500 });
  return NextResponse.json({
    items: (data ?? []).map((item) => ({ ...item, amount: Number(item.amount) })),
  });
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("recurring_items")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id, name, amount, category, direction, cadence, next_date, active")
    .single();

  if (error || !data) return NextResponse.json({ error: "Failed to save schedule" }, { status: 500 });
  return NextResponse.json({ item: { ...data, amount: Number(data.amount) } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id, action, ...fields } = parsed.data;
  const { data: item, error: loadError } = await supabase
    .from("recurring_items")
    .select("id, name, amount, category, direction, cadence, next_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError || !item) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

  if (action === "confirm" || action === "skip") {
    const amount = fields.amount ?? Number(item.amount);
    const nextDate = advanceRecurringDate(String(item.next_date), item.cadence as RecurringCadence);

    if (action === "confirm") {
      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: user.id,
        txn_date: item.next_date,
        amount,
        category: item.category,
        description: item.name,
        direction: item.direction,
        // The column default is "purchase"; money in must be tagged as income
        // or it is counted as spending by every left-to-spend calculation.
        line_role: item.direction === "in" ? "income" : "purchase",
        source: "scheduled",
        category_confirmed: true,
        recurring_item_id: item.id,
      });
      if (insertError) return NextResponse.json({ error: "Failed to post schedule" }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("recurring_items")
      .update({ amount, next_date: nextDate })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateError) return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });

    const unlocks = action === "confirm" ? await awardForEvent(supabase, user.id) : [];
    if (action === "confirm") await recordDerivedHealthScore(supabase, user.id);
    const gamification =
      action === "confirm" ? await getGamificationSummary(supabase, user.id, unlocks) : null;
    return NextResponse.json({ ok: true, gamification });
  }

  const updates: Record<string, unknown> = {};
  if (fields.name != null) updates.name = fields.name;
  if (fields.amount != null) updates.amount = fields.amount;
  if (fields.category != null) updates.category = fields.category;
  if (fields.direction != null) updates.direction = fields.direction;
  if (fields.cadence != null) updates.cadence = fields.cadence;
  if (fields.next_date != null) updates.next_date = fields.next_date;
  if (fields.active != null) updates.active = fields.active;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("recurring_items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing schedule id" }, { status: 400 });

  const { error } = await supabase
    .from("recurring_items")
    .update({ active: false })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to remove schedule" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
