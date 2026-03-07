"use server";

import { createClient } from "@/lib/supabase/server";
import { holdingsSchema, toDbAccountType } from "@/lib/schemas/holdings";
import { redirect } from "next/navigation";

export type HoldingsResult = {
  error?: string;
};

export async function saveHoldings(formData: {
  accounts: {
    id: string;
    accountType: string;
    accountName?: string;
    holdings: { tickerOrName?: string; balance: number; units?: number }[];
  }[];
}): Promise<HoldingsResult> {
  const parsed = holdingsSchema.safeParse(formData);
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

  const { error: deleteError } = await supabase
    .from("investment_holdings")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    return { error: "Failed to update holdings. Please try again." };
  }

  const rows = parsed.data.accounts.map((account) => {
    const holdingsJson = account.holdings.map((h) => ({
      ticker: h.tickerOrName || "",
      name: h.tickerOrName || "",
      balance: h.balance,
      units: h.units ?? null,
    }));

    const totalValue = account.holdings.reduce((sum, h) => sum + h.balance, 0);

    return {
      user_id: user.id,
      account_type: toDbAccountType(account.accountType),
      holdings: holdingsJson,
      total_value: totalValue,
      source: "manual" as const,
    };
  });

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("investment_holdings")
      .insert(rows);

    if (insertError) {
      return { error: "Failed to save holdings. Please try again." };
    }
  }

  redirect("/onboarding/generating");
}
