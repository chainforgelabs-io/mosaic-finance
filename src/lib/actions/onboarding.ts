"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { financialProfileSchema } from "@/lib/schemas/onboarding";

export type OnboardingResult = {
  error?: string;
};

export async function saveFinancialProfile(formData: {
  alias: string;
  age: number;
  province: string;
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
    .upsert({
      id: user.id,
      alias: parsed.data.alias,
      province: parsed.data.province,
      age: parsed.data.age,
      employment_type: parsed.data.employmentType,
      family_structure: parsed.data.familyStructure,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    return { error: "Failed to save profile. Please try again." };
  }

  const { error: financialError } = await supabase
    .from("financial_profiles")
    .upsert(
      {
        user_id: user.id,
        age: parsed.data.age,
        province: parsed.data.province,
        employment_type: parsed.data.employmentType,
        family_structure: parsed.data.familyStructure,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (financialError) {
    return { error: "Failed to create financial profile. Please try again." };
  }

  redirect("/onboarding/fact-find");
}
