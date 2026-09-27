import type { SupabaseClient } from "@supabase/supabase-js";
import { cashValueAssetsFromFactFind } from "@/lib/assets/life-insurance-cash-value";

/**
 * Record permanent-life cash value as a fixed asset when the fact-find
 * mentioned one and none is on file yet. Safe to call on every assets load.
 */
export async function seedLifeInsuranceCashAssets(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("fixed_assets")
    .select("id")
    .eq("user_id", userId)
    .eq("category", "life_insurance")
    .limit(1)
    .maybeSingle();

  if (existing) return;

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select("id, metadata")
    .eq("user_id", userId)
    .eq("session_type", "fact-find")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return;

  const extracted =
    session.metadata && typeof session.metadata === "object"
      ? (session.metadata as { extracted_data?: unknown }).extracted_data
      : null;

  let assets = cashValueAssetsFromFactFind(extracted);
  if (assets.length === 0) {
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("content")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    const transcript = (messages ?? [])
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .join("\n");
    assets = cashValueAssetsFromFactFind(null, transcript);
  }

  if (assets.length === 0) return;

  const { error } = await supabase.from("fixed_assets").insert(
    assets.map((a) => ({
      user_id: userId,
      category: "life_insurance",
      name: a.name,
      estimated_value: a.cashValue,
      notes: a.notes,
    })),
  );

  if (error) {
    console.error("[life-insurance] seed insert failed", error.code);
  }
}
