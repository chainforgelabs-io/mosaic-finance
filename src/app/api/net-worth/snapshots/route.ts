import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";
import { monthKey, todayIso } from "@/lib/tracking/dates";
import type { SnapshotBreakdown } from "@/types/tracking";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("net_worth_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 });
  return NextResponse.json({ snapshots: data ?? [] });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [holdingsRes, assetsRes, profileRes] = await Promise.all([
    supabase
      .from("investment_holdings")
      .select("id, account_type, total_value")
      .eq("user_id", user.id),
    supabase
      .from("fixed_assets")
      .select("id, name, category, estimated_value")
      .eq("user_id", user.id),
    supabase
      .from("financial_profiles")
      .select("major_debts, emergency_fund_months")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const holdings = holdingsRes.data ?? [];
  const assets = assetsRes.data ?? [];
  const debtsRaw = (profileRes.data?.major_debts ?? []) as {
    type?: string;
    amount?: number;
    balance?: number;
  }[];

  const investments = holdings.map((h) => ({
    id: h.id as string,
    account_type: String(h.account_type ?? ""),
    value: num(h.total_value),
  }));
  const fixed_assets = assets.map((a) => ({
    id: a.id as string,
    name: String(a.name ?? ""),
    category: String(a.category ?? ""),
    value: num(a.estimated_value),
  }));
  const debts = debtsRaw.map((d) => ({
    type: String(d.type ?? "Debt"),
    value: num(d.amount ?? d.balance),
  }));

  const investments_total = investments.reduce((s, i) => s + i.value, 0);
  const fixed_assets_total = fixed_assets.reduce((s, i) => s + i.value, 0);
  const debts_total = debts.reduce((s, i) => s + i.value, 0);
  const net_worth = investments_total + fixed_assets_total - debts_total;
  const breakdown: SnapshotBreakdown = { investments, fixed_assets, debts };

  const snapshot_date = todayIso();
  const thisMonth = monthKey(snapshot_date);

  const { data: existing } = await supabase
    .from("net_worth_snapshots")
    .select("id, snapshot_date, debts_total")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: false });

  const monthMatch = (existing ?? []).find((s) => monthKey(s.snapshot_date) === thisMonth);
  const prior = (existing ?? []).find((s) => monthKey(s.snapshot_date) !== thisMonth);

  const payload = {
    snapshot_date,
    investments_total,
    fixed_assets_total,
    debts_total,
    net_worth,
    breakdown,
  };

  let snapshot;
  if (monthMatch) {
    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .update(payload)
      .eq("id", monthMatch.id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Failed to update snapshot" }, { status: 500 });
    }
    snapshot = data;
  } else {
    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .insert({ user_id: user.id, ...payload })
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
    }
    snapshot = data;
  }

  const unlocks = await awardForEvent(supabase, user.id, {
    netWorth: net_worth,
    currentDebtsTotal: debts_total,
    priorDebtsTotal: prior ? num(prior.debts_total) : null,
    emergencyFundMonths:
      profileRes.data?.emergency_fund_months != null
        ? Number(profileRes.data.emergency_fund_months)
        : null,
  });
  const gamification = await getGamificationSummary(supabase, user.id, unlocks);

  return NextResponse.json({ snapshot, gamification }, { status: monthMatch ? 200 : 201 });
}
