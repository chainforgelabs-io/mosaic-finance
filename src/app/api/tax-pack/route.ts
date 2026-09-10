import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { entitlementDenied, ENTITLEMENT_COPY, loadProfileEntitlements } from "@/lib/entitlements";
import { buildTaxPack } from "@/lib/tax-pack/build";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entitlements = await loadProfileEntitlements(user.id);
  if (!entitlements.hasTaxPack) {
    return entitlementDenied("taxPack", ENTITLEMENT_COPY.taxPack);
  }

  const [{ data: profile }, { data: financial }, { data: holdings }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("age, province")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("financial_profiles")
      .select("annual_income")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("investment_holdings").select("account_type").eq("user_id", user.id),
  ]);

  const pack = buildTaxPack({
    age: profile?.age ?? null,
    province: profile?.province ?? null,
    annualIncome: financial?.annual_income != null ? Number(financial.annual_income) : null,
    accountTypes: (holdings ?? []).map((h) => String(h.account_type ?? "")),
  });

  return NextResponse.json(pack);
}
