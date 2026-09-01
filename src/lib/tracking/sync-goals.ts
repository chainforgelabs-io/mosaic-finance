import type { SupabaseClient } from "@supabase/supabase-js";
import { inferGoalType, type GoalPriority } from "@/lib/tracking/categories";

interface JsonbGoal {
  goal?: string;
  type?: string;
  target_amount?: number | null;
  target_year?: number | null;
  target_date?: string | null;
  priority?: string;
}

function toDate(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}-12-31`;
  }
  const s = String(value);
  if (/^\d{4}$/.test(s)) return `${s}-12-31`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const year = parseInt(s, 10);
  if (Number.isFinite(year) && year > 1900 && year < 2200) return `${year}-12-31`;
  return null;
}

function toPriority(raw: string | undefined): GoalPriority {
  if (raw === "high" || raw === "low" || raw === "medium") return raw;
  return "medium";
}

export async function seedGoalsFromProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  const { data: profile } = await supabase
    .from("financial_profiles")
    .select("financial_goals")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const raw = profile?.financial_goals;
  if (!Array.isArray(raw) || raw.length === 0) return;

  const rows = (raw as JsonbGoal[])
    .map((g) => {
      const name = String(g.goal ?? g.type ?? "").trim();
      if (!name) return null;
      return {
        user_id: userId,
        name,
        goal_type: inferGoalType(g.type ?? g.goal),
        target_amount: g.target_amount ?? null,
        current_amount: 0,
        target_date: toDate(g.target_date ?? g.target_year ?? null),
        priority: toPriority(g.priority),
        status: "active" as const,
        source: "fact_find" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  if (rows.length === 0) return;
  await supabase.from("goals").insert(rows);
}

export async function upsertGoalsFromExtracted(
  supabase: SupabaseClient,
  userId: string,
  goals: JsonbGoal[],
  source: "fact_find" | "onboarding" | "manual" = "fact_find",
): Promise<void> {
  if (goals.length === 0) return;

  const { data: existing } = await supabase
    .from("goals")
    .select("id, name")
    .eq("user_id", userId);

  const byName = new Map(
    ((existing ?? []) as { id: string; name: string }[]).map((g) => [
      g.name.toLowerCase(),
      g.id,
    ]),
  );

  for (const g of goals) {
    const name = String(g.goal ?? g.type ?? "").trim();
    if (!name) continue;
    const payload = {
      name,
      goal_type: inferGoalType(g.type ?? g.goal),
      target_amount: g.target_amount ?? null,
      target_date: toDate(g.target_date ?? g.target_year ?? null),
      priority: toPriority(g.priority),
      source,
    };
    const id = byName.get(name.toLowerCase());
    if (id) {
      await supabase.from("goals").update(payload).eq("id", id).eq("user_id", userId);
    } else {
      await supabase.from("goals").insert({
        user_id: userId,
        current_amount: 0,
        status: "active",
        ...payload,
      });
    }
  }
}
