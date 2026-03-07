"use server";

import { createClient } from "@/lib/supabase/server";

export type RiskProfileResult = {
  error?: string;
};

export async function saveRiskProfile(formData: {
  riskScore: string;
  conversationalInsights?: string;
  questionnaireResponses?: Record<string, unknown>;
}): Promise<RiskProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated. Please sign in." };
  }

  const { data: existing } = await supabase
    .from("risk_profiles")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("risk_profiles")
      .update({
        risk_score: formData.riskScore,
        questionnaire_responses: formData.questionnaireResponses ?? null,
        conversational_insights: formData.conversationalInsights ?? null,
        confirmed_by_user: true,
      })
      .eq("user_id", user.id);

    if (error) {
      return { error: "Failed to save risk profile. Please try again." };
    }
  } else {
    const { error } = await supabase.from("risk_profiles").insert({
      user_id: user.id,
      risk_score: formData.riskScore,
      questionnaire_responses: formData.questionnaireResponses ?? null,
      conversational_insights: formData.conversationalInsights ?? null,
      confirmed_by_user: true,
    });

    if (error) {
      return { error: "Failed to save risk profile. Please try again." };
    }
  }

  return {};
}
