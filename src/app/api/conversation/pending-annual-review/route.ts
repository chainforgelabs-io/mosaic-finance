import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function countPendingSections(extracted: Record<string, unknown>): number {
  let n = 0;
  const inc = extracted.income_changes;
  if (inc && typeof inc === "object") {
    const o = inc as Record<string, unknown>;
    if (o.new_household_income != null || o.new_primary_income != null) n++;
  }
  const exp = extracted.expense_changes;
  if (exp && typeof exp === "object") {
    const o = exp as Record<string, unknown>;
    if (o.new_monthly_expenses != null || o.new_monthly_savings != null) n++;
  }
  if (Array.isArray(extracted.new_debts) && extracted.new_debts.length > 0) n++;
  if (
    Array.isArray(extracted.goal_updates) &&
    extracted.goal_updates.length > 0
  )
    n++;
  if (
    Array.isArray(extracted.goal_amount_or_timeline_changes) &&
    extracted.goal_amount_or_timeline_changes.length > 0
  )
    n++;
  const hc = extracted.household_changes;
  if (hc && typeof hc === "object") {
    const o = hc as Record<string, unknown>;
    if (
      (Array.isArray(o.added) && o.added.length > 0) ||
      (Array.isArray(o.modified) && o.modified.length > 0)
    )
      n++;
  }
  if (
    Array.isArray(extracted.holdings_changes) &&
    extracted.holdings_changes.length > 0
  )
    n++;
  if (
    Array.isArray(extracted.fixed_asset_changes) &&
    extracted.fixed_asset_changes.length > 0
  )
    n++;
  const rt = extracted.risk_tolerance_change;
  if (rt && typeof rt === "object") {
    const o = rt as Record<string, unknown>;
    if (o.changed === true) n++;
  }
  return n;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions } = await supabase
    .from("conversation_sessions")
    .select("id, metadata, created_at")
    .eq("user_id", user.id)
    .eq("session_type", "annual-review")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(15);

  const pending = (sessions ?? []).filter((s) => {
    const m = s.metadata as Record<string, unknown> | null | undefined;
    if (!m?.extracted_data || typeof m.extracted_data !== "object") {
      return false;
    }
    if (m.applied_at) return false;
    return true;
  });

  const payload = pending.map((s) => {
    const m = s.metadata as Record<string, unknown>;
    const extracted = m.extracted_data as Record<string, unknown>;
    return {
      sessionId: s.id,
      createdAt: s.created_at,
      changeSectionCount: countPendingSections(extracted),
    };
  });

  return NextResponse.json({ pending: payload });
}
