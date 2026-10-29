"use server";

import { createClient } from "@/lib/supabase/server";
import { holdingsSchema, toDbAccountType } from "@/lib/schemas/holdings";

export type HoldingsResult = {
  error?: string;
  ok?: boolean;
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

  const { data: existing, error: existingError } = await supabase
    .from("investment_holdings")
    .select("id")
    .eq("user_id", user.id);

  if (existingError) {
    console.error("[saveHoldings] select investment_holdings:", existingError);
    return { error: "Failed to update holdings. Please try again." };
  }

  const existingIds = new Set((existing ?? []).map((row) => row.id as string));
  const kept = new Set<string>();

  for (const account of parsed.data.accounts) {
    const holdingsJson = account.holdings.map((h) => ({
      ticker: h.tickerOrName || "",
      name: h.tickerOrName || "",
      balance: h.balance,
      units: h.units ?? null,
    }));
    const totalValue = account.holdings.reduce((sum, h) => sum + h.balance, 0);
    const payload = {
      account_type: toDbAccountType(account.accountType),
      holdings: holdingsJson,
      total_value: totalValue,
      source: "manual" as const,
    };
    const keepId = isUuid(account.id) && existingIds.has(account.id);
    if (keepId) {
      const { error: updateError } = await supabase
        .from("investment_holdings")
        .update(payload)
        .eq("id", account.id)
        .eq("user_id", user.id);
      if (updateError) {
        console.error("[saveHoldings] update investment_holdings:", updateError);
        return { error: "Failed to save holdings. Please try again." };
      }
      kept.add(account.id);
      continue;
    }

    const insertId = isUuid(account.id) ? account.id : crypto.randomUUID();
    const { error: insertError } = await supabase.from("investment_holdings").insert({
      id: insertId,
      user_id: user.id,
      ...payload,
    });
    if (insertError) {
      console.error("[saveHoldings] insert investment_holdings:", insertError);
      return { error: "Failed to save holdings. Please try again." };
    }
    kept.add(insertId);
  }

  const stale = [...existingIds].filter((id) => !kept.has(id));
  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from("investment_holdings")
      .delete()
      .eq("user_id", user.id)
      .in("id", stale);
    if (deleteError) {
      console.error("[saveHoldings] delete investment_holdings:", deleteError);
      return { error: "Failed to update holdings. Please try again." };
    }
  }

  return { ok: true };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
