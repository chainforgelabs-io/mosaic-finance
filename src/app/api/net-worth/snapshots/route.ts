import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";
import { recordDerivedHealthScore } from "@/lib/health-score/record";
import { enrichBreakdown, isLiabilityTerm, snapshotDateForMonth } from "@/lib/net-worth/tracking";
import { addMonths, monthKey, startOfMonth, todayIso } from "@/lib/tracking/dates";
import type { SnapshotBreakdown, SnapshotBreakdownItem } from "@/types/tracking";

const lineSchema = z.object({
  id: z.string().max(80).optional(),
  account_type: z.string().max(80).optional(),
  name: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  type: z.string().max(120).optional(),
  value: z.number().min(0).max(100_000_000),
  credit_limit: z.number().min(0).max(100_000_000).nullable().optional(),
  term: z.enum(["short", "long"]).nullable().optional(),
});

const bodySchema = z.object({
  snapshot_month: z.string().regex(/^\d{4}-\d{2}$/),
  investments: z.array(lineSchema).max(100),
  fixed_assets: z.array(lineSchema).max(100),
  debts: z.array(lineSchema).max(100),
});

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.text();
  let filed: z.infer<typeof bodySchema> | null = null;
  if (raw.trim()) {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
    const today = todayIso();
    const oldest = monthKey(addMonths(startOfMonth(today), -36));
    if (parsed.data.snapshot_month > monthKey(today) || parsed.data.snapshot_month < oldest) {
      return NextResponse.json({ error: "That month cannot be saved" }, { status: 400 });
    }
    filed = parsed.data;
  }

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
    credit_limit?: number | null;
    term?: "short" | "long" | null;
  }[];

  const investments = filed
    ? filed.investments.map(toBreakdownItem)
    : holdings.map((h) => ({
        id: h.id as string,
        account_type: String(h.account_type ?? ""),
        value: num(h.total_value),
      }));
  const fixed_assets = filed
    ? filed.fixed_assets.map(toBreakdownItem)
    : assets.map((a) => ({
        id: a.id as string,
        name: String(a.name ?? ""),
        category: String(a.category ?? ""),
        value: num(a.estimated_value),
      }));
  const debts = filed
    ? filed.debts.map(toBreakdownItem)
    : debtsRaw.map((d) => ({
        type: String(d.type ?? "Debt"),
        value: num(d.amount ?? d.balance),
        ...(d.credit_limit != null && Number.isFinite(Number(d.credit_limit))
          ? { credit_limit: num(d.credit_limit) }
          : {}),
        ...(isLiabilityTerm(d.term) ? { term: d.term } : {}),
      }));

  const investments_total = investments.reduce((s, i) => s + i.value, 0);
  const fixed_assets_total = fixed_assets.reduce((s, i) => s + i.value, 0);
  const debts_total = debts.reduce((s, i) => s + i.value, 0);
  const net_worth = investments_total + fixed_assets_total - debts_total;
  const breakdown: SnapshotBreakdown = enrichBreakdown({ investments, fixed_assets, debts });

  const today = todayIso();
  const snapshot_date = filed ? snapshotDateForMonth(filed.snapshot_month, today) : today;
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

  const filingPast = filed != null && filed.snapshot_month !== monthKey(today);
  const unlocks = filingPast
    ? []
    : await awardForEvent(supabase, user.id, {
        netWorth: net_worth,
        currentDebtsTotal: debts_total,
        priorDebtsTotal: prior ? num(prior.debts_total) : null,
        emergencyFundMonths:
          profileRes.data?.emergency_fund_months != null
            ? Number(profileRes.data.emergency_fund_months)
            : null,
      });
  const gamification = filingPast ? { newUnlocks: [] } : await getGamificationSummary(supabase, user.id, unlocks);
  if (!filingPast) {
    // Awaited on purpose: a fire-and-forget promise can be dropped when the
    // serverless function returns, leaving the live score stale.
    await recordDerivedHealthScore(supabase, user.id);
  }

  return NextResponse.json({ snapshot, gamification }, { status: monthMatch ? 200 : 201 });
}

function toBreakdownItem(line: z.infer<typeof lineSchema>): SnapshotBreakdownItem {
  return {
    ...(line.id ? { id: line.id } : {}),
    ...(line.account_type ? { account_type: line.account_type } : {}),
    ...(line.name ? { name: line.name } : {}),
    ...(line.category ? { category: line.category } : {}),
    ...(line.type ? { type: line.type } : {}),
    value: line.value,
    ...(line.credit_limit != null ? { credit_limit: line.credit_limit } : {}),
    ...(line.term ? { term: line.term } : {}),
  };
}
