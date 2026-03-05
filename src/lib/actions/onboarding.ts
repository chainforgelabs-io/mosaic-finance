"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { financialProfileSchema } from "@/lib/schemas/onboarding";

const EMPLOYMENT_DB_MAP: Record<string, string> = {
  "Employed": "employed",
  "Self-Employed": "self-employed",
  "Retired": "retired",
  "Student": "student",
};

const FAMILY_DB_MAP: Record<string, string> = {
  "Single": "single",
  "Married": "married",
  "Common-Law": "common-law",
  "Single Parent": "single-parent",
  "Family": "family",
};

export type OnboardingResult = {
  error?: string;
};

export async function saveFinancialProfile(formData: {
  age: number;
  employmentType: string;
  familyStructure: string;
}): Promise<OnboardingResult> {
  const parsed = financialProfileSchema.safeParse(formData);
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

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      age: parsed.data.age,
      employment_type: EMPLOYMENT_DB_MAP[parsed.data.employmentType] ?? parsed.data.employmentType.toLowerCase(),
      family_structure: FAMILY_DB_MAP[parsed.data.familyStructure] ?? parsed.data.familyStructure.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: "Failed to save profile. Please try again." };
  }

  const { data: existingProfile } = await supabase
    .from("financial_profiles")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!existingProfile) {
    const { error: financialError } = await supabase
      .from("financial_profiles")
      .insert({
        user_id: user.id,
      });

    if (financialError) {
      return { error: "Failed to create financial profile. Please try again." };
    }
  }

  redirect("/onboarding/fact-find");
}
