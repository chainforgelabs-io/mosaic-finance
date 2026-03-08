"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { financialProfileSchema } from "@/lib/schemas/onboarding";
import type { FactFindAccount } from "@/stores/onboarding";

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
  sex?: string;
  annualIncome?: number;
  employmentType: string;
  occupation?: string;
  familyStructure: string;
  householdMembers?: {
    relationship: string;
    age?: number;
    sex?: string;
    occupation?: string;
    annualIncome?: number;
    isDependant: boolean;
    notes?: string;
  }[];
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
      sex: parsed.data.sex ?? null,
      annual_income: parsed.data.annualIncome ?? 0,
      employment_type: EMPLOYMENT_DB_MAP[parsed.data.employmentType] ?? parsed.data.employmentType.toLowerCase(),
      occupation: parsed.data.occupation ?? null,
      family_structure: FAMILY_DB_MAP[parsed.data.familyStructure] ?? parsed.data.familyStructure.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: "Failed to save profile. Please try again." };
  }

  // Save household members
  const members = parsed.data.householdMembers ?? [];
  if (members.length > 0) {
    // Clear existing members first
    await supabase
      .from("household_members")
      .delete()
      .eq("user_id", user.id);

    const rows = members.map((m) => ({
      user_id: user.id,
      relationship: m.relationship,
      age: m.age ?? null,
      sex: m.sex ?? null,
      occupation: m.occupation ?? null,
      annual_income: m.annualIncome ?? 0,
      is_dependant: m.isDependant,
      notes: m.notes ?? null,
    }));

    const { error: membersError } = await supabase
      .from("household_members")
      .insert(rows);

    if (membersError) {
      return { error: "Failed to save household members. Please try again." };
    }
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

/**
 * Fetch investment accounts from the most recent completed fact-find session.
 * Used as a fallback when the onboarding store has no accounts (e.g. page refresh, store reset).
 */
export async function getFactFindAccounts(): Promise<FactFindAccount[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: session } = await supabase
    .from("conversation_sessions")
    .select("metadata")
    .eq("user_id", user.id)
    .eq("session_type", "fact-find")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const metadata = session?.metadata as Record<string, unknown> | null;
  const extractedData = metadata?.extracted_data as Record<string, unknown> | null;
  const investmentAccounts = extractedData?.investment_accounts;

  if (!Array.isArray(investmentAccounts) || investmentAccounts.length === 0) {
    return [];
  }

  return investmentAccounts
    .filter(
      (acc): acc is { account_type?: string; approximate_balance?: number; description?: string } =>
        acc != null && typeof acc === "object",
    )
    .map((acc) => ({
      account_type: String(acc.account_type ?? "non-registered"),
      approximate_balance: Number(acc.approximate_balance ?? 0),
      description: String(acc.description ?? ""),
    }));
}
