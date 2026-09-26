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

export function goalRowFromExtracted(
  g: JsonbGoal,
  retirementAge?: number | null,
) {
  const name = String(g.goal ?? g.type ?? "").trim();
  if (!name) return null;
  const goalType = inferGoalType(g.type ?? g.goal);
  const rawAmount = g.target_amount;
  const amountUnknown = rawAmount == null || rawAmount === 0;
  const useAge = goalType === "retirement" && retirementAge != null && retirementAge >= 1 && retirementAge <= 120;
  return {
    name,
    goal_type: goalType,
    target_amount: amountUnknown ? null : rawAmount,
    amount_unknown: amountUnknown,
    target_date: useAge ? null : toDate(g.target_date ?? g.target_year ?? null),
    target_age: useAge ? Math.round(retirementAge) : null,
    priority: toPriority(g.priority),
  };
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

  let raw = profile?.financial_goals as JsonbGoal[] | null;
  let retirementAge: number | null = null;

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select("metadata")
    .eq("user_id", userId)
    .eq("session_type", "fact-find")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const extracted =
    session?.metadata && typeof session.metadata === "object"
      ? (session.metadata as { extracted_data?: Record<string, unknown> }).extracted_data
      : null;
  if (extracted && typeof extracted.retirement_target_age === "number") {
    retirementAge = extracted.retirement_target_age;
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    const fromChat = extracted?.goals;
    raw = Array.isArray(fromChat) ? (fromChat as JsonbGoal[]) : null;
  }
  if (!Array.isArray(raw) || raw.length === 0) return;

  const rows = raw
    .map((g) => {
      const mapped = goalRowFromExtracted(g, retirementAge);
      if (!mapped) return null;
      return {
        user_id: userId,
        ...mapped,
        current_amount: 0,
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
  retirementAge?: number | null,
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
    const mapped = goalRowFromExtracted(g, retirementAge);
    if (!mapped) continue;
    const payload = {
      ...mapped,
      source,
    };
    const id = byName.get(mapped.name.toLowerCase());
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
