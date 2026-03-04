"use server";

import { createClient } from "@/lib/supabase/server";
import { riskProfileSchema } from "@/lib/schemas/risk-profile";
import { redirect } from "next/navigation";

export type RiskProfileResult = {
  error?: string;
};

export async function saveRiskProfile(formData: {
  questionnaireAnswers: Record<string, number>;
  riskScore: number;
  riskLabel: string;
}): Promise<RiskProfileResult> {
  const parsed = riskProfileSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated. Please sign in." };
  }

  const { error } = await supabase.from("risk_profiles").upsert(
    {
      user_id: user.id,
      questionnaire_answers: parsed.data.questionnaireAnswers,
      risk_score: parsed.data.riskScore,
      risk_label: parsed.data.riskLabel,
      confirmed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: "Failed to save risk profile. Please try again." };
  }

  redirect("/onboarding/generating");
}
