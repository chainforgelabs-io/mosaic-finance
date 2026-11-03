import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureAPIError } from "@/lib/sentry";

const TABLES = [
  "financial_profiles",
  "household_members",
  "goals",
  "transactions",
  "recurring_items",
  "budget_plan_entries",
  "budget_plan_schedules",
  "net_worth_snapshots",
  "investment_holdings",
  "fixed_assets",
  "risk_profiles",
  "conversation_sessions",
  "conversation_messages",
] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileRes = await supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle();
    if (profileRes.error) {
      return NextResponse.json({ error: "Could not export your data." }, { status: 500 });
    }

    let profile: Record<string, unknown> | null = null;
    if (profileRes.data) {
      const {
        stripe_customer_id: _stripeCustomer,
        stripe_subscription_id: _stripeSubscription,
        ...rest
      } = profileRes.data as Record<string, unknown>;
      void _stripeCustomer;
      void _stripeSubscription;
      profile = rest;
    }

    const rows = await Promise.all(
      TABLES.map(async (table) => {
        const { data, error } = await supabase.from(table).select("*").eq("user_id", user.id);
        return [table, error ? { error: "unavailable" } : (data ?? [])] as const;
      }),
    );

    const plans = await supabase
      .from("financial_plans")
      .select("id, version, status, plan_data, created_at, updated_at, delivered_at")
      .eq("user_id", user.id);

    const payload = {
      exported_at: new Date().toISOString(),
      profile,
      ...Object.fromEntries(rows),
      financial_plans: plans.error ? { error: "unavailable" } : (plans.data ?? []),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mosaic-data-export.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    captureAPIError(error, { route: "user/export" });
    return NextResponse.json({ error: "Could not export your data." }, { status: 500 });
  }
}
