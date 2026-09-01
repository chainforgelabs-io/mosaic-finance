import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { GOAL_PRIORITIES, GOAL_STATUSES, GOAL_TYPES } from "@/lib/tracking/categories";
import { seedGoalsFromProfile } from "@/lib/tracking/sync-goals";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  goal_type: z.enum(GOAL_TYPES),
  target_amount: z.number().min(0).optional().nullable(),
  current_amount: z.number().min(0).optional().nullable(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  priority: z.enum(GOAL_PRIORITIES).optional().default("medium"),
  status: z.enum(GOAL_STATUSES).optional().default("active"),
  source: z.enum(["onboarding", "fact_find", "manual"]).optional().default("manual"),
});

const patchSchema = createSchema.partial().extend({
  id: z.string().uuid(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await seedGoalsFromProfile(supabase, user.id);

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  return NextResponse.json({ goals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const replace = body?.replace === true;
  const asBatch = Array.isArray(body?.goals);
  const items = asBatch ? body.goals : [body];
  const parsed = z.array(createSchema).min(1).max(30).safeParse(items);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (replace) {
    await supabase.from("goals").delete().eq("user_id", user.id);
  }

  const rows = parsed.data.map((g) => ({
    user_id: user.id,
    name: g.name,
    goal_type: g.goal_type,
    target_amount: g.target_amount ?? null,
    current_amount: g.current_amount ?? 0,
    target_date: g.target_date ?? null,
    priority: g.priority ?? "medium",
    status: g.status ?? "active",
    source: g.source ?? "manual",
  }));

  const { data, error } = await supabase.from("goals").insert(rows).select();
  if (error) return NextResponse.json({ error: "Failed to save goals" }, { status: 500 });
  return NextResponse.json({ goals: data ?? [] }, { status: 201 });
}

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

  const { id, ...updates } = parsed.data;
  const { data, error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Goal not found or update failed" }, { status: 404 });
  }

  let gamification = undefined;
  if (updates.status === "achieved") {
    const unlocks = await awardForEvent(supabase, user.id, { goalJustAchieved: true });
    gamification = await getGamificationSummary(supabase, user.id, unlocks);
  }

  return NextResponse.json({ goal: data, gamification });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing goal id" }, { status: 400 });

  const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
