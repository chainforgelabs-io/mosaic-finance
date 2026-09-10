import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { SPENDING_CATEGORIES } from "@/lib/tracking/categories";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";

const putSchema = z.object({
  budgets: z.array(
    z.object({
      category: z.enum(SPENDING_CATEGORIES),
      monthly_limit: z.number().min(0),
    }),
  ),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("category_budgets")
    .select("category, monthly_limit, effective_from")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to load budgets" }, { status: 500 });
  return NextResponse.json({ budgets: data ?? [] });
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

  const monthStart = new Date();
  monthStart.setDate(1);
  const effectiveFrom = monthStart.toISOString().slice(0, 10);

  const rows = parsed.data.budgets.map((b) => ({
    user_id: user.id,
    category: b.category,
    monthly_limit: b.monthly_limit,
    effective_from: effectiveFrom,
  }));

  const { error } = await supabase.from("category_budgets").upsert(rows, {
    onConflict: "user_id,category",
  });

  if (error) return NextResponse.json({ error: "Failed to save budgets" }, { status: 500 });

  const unlocks = await awardForEvent(supabase, user.id, { budgetJustSet: true });
  const gamification = await getGamificationSummary(supabase, user.id, unlocks);

  return NextResponse.json({ ok: true, gamification });
}
