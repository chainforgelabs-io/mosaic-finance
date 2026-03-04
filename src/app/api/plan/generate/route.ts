import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("financial_plans")
    .select("id, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing && (existing.status === "generating" || existing.status === "pending_review" || existing.status === "delivered")) {
    return NextResponse.json({
      planId: existing.id,
      status: existing.status,
    });
  }

  const { data: profile } = await supabase
    .from("financial_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: holdings } = await supabase
    .from("investment_holdings")
    .select("*")
    .eq("user_id", user.id);

  const { data: riskProfile } = await supabase
    .from("risk_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (!profile || !riskProfile) {
    return NextResponse.json(
      { error: "Onboarding incomplete. Please complete all steps first." },
      { status: 400 },
    );
  }

  const { data: plan, error } = await supabase
    .from("financial_plans")
    .insert({
      user_id: user.id,
      status: "generating",
      financial_profile: profile,
      holdings_snapshot: holdings ?? [],
      risk_profile_snapshot: {
        score: riskProfile.risk_score,
        label: riskProfile.risk_label,
      },
      tier: userProfile?.tier ?? "free",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create plan. Please try again." },
      { status: 500 },
    );
  }

  // Transition to pending_review after generation completes.
  // In production this would be triggered by a background job / edge function
  // after Claude finishes generating the plan sections. For now, simulate
  // the generation delay and then update the status.
  supabase
    .from("financial_plans")
    .update({
      status: "pending_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", plan.id)
    .then();

  return NextResponse.json({
    planId: plan.id,
    status: plan.status,
  });
}
