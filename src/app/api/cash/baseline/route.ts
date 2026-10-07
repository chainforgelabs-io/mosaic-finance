import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { awardForEvent, getGamificationSummary } from "@/lib/gamification/award";
import { recordDerivedHealthScore } from "@/lib/health-score/record";
import { createClient } from "@/lib/supabase/server";
import { buildStatementBaseline } from "@/lib/tracking/statement-baseline";
import { todayIso } from "@/lib/tracking/dates";

const lineSchema = z.object({
  txn_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  category: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  description: z.string().max(300).optional().nullable(),
  note: z.string().max(300).optional().nullable(),
  document_id: z.string().uuid().optional().nullable(),
  line_role: z.enum(["purchase", "income", "card_payment", "transfer", "fee", "interest"]),
  instrument: z.enum(["credit", "debit"]),
});

const repeatSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.number().positive(),
  category: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  direction: z.enum(["in", "out"]),
  cadence: z.enum(["weekly", "biweekly", "monthly"]),
  next_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bodySchema = z.object({
  transactions: z.array(lineSchema).max(2000),
  repeats: z.array(repeatSchema).max(5).default([]),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const today = todayIso();
  const baseline = buildStatementBaseline(
    parsed.data.transactions.map((line) => ({
      txn_date: line.txn_date,
      amount: line.amount,
      description: line.description ?? "",
      suggested_category: line.category,
      instrument: line.instrument,
      line_role: line.line_role,
    })),
    today,
  );
  if (!baseline) {
    return NextResponse.json(
      { error: "Those statements did not include dated transactions." },
      { status: 400 },
    );
  }

  const rows = parsed.data.transactions.map((line) => ({
    user_id: user.id,
    txn_date: line.txn_date,
    amount: line.amount,
    category: line.category,
    description: line.description ?? null,
    note: line.note ?? null,
    source: "screenshot",
    document_id: line.document_id ?? null,
    direction: line.line_role === "income" ? "in" : "out",
    line_role: line.line_role,
    instrument: line.instrument,
    category_confirmed: true,
  }));

  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await supabase.from("transactions").insert(rows.slice(i, i + 400));
    if (error) return NextResponse.json({ error: "Failed to save statement lines" }, { status: 500 });
  }

  if (parsed.data.repeats.length > 0) {
    const { error } = await supabase.from("recurring_items").insert(
      parsed.data.repeats.map((item) => ({
        user_id: user.id,
        name: item.name,
        amount: item.amount,
        category: item.category,
        direction: item.direction,
        cadence: item.cadence,
        next_date: item.next_date,
      })),
    );
    if (error) return NextResponse.json({ error: "Failed to save repeating items" }, { status: 500 });
  }

  const { error: baselineError } = await supabase.from("spending_baselines").upsert(
    {
      user_id: user.id,
      income_monthly: baseline.incomeMonthly,
      needs_monthly: baseline.needsMonthly,
      flexible_monthly: baseline.flexibleMonthly,
      left_monthly: baseline.leftMonthly,
      credit_growth_monthly: baseline.creditGrowthMonthly,
      months_covered: baseline.months.length,
      partial: baseline.partial,
      flexible_breakdown: baseline.flexibleByCategory,
      observation: baseline.observation,
    },
    { onConflict: "user_id" },
  );
  if (baselineError) return NextResponse.json({ error: "Failed to save the monthly picture" }, { status: 500 });

  const unlocks = rows.length > 0 ? await awardForEvent(supabase, user.id) : [];
  const gamification = await getGamificationSummary(supabase, user.id, unlocks);
  if (rows.length > 0) await recordDerivedHealthScore(supabase, user.id);

  return NextResponse.json({
    baseline: {
      income_monthly: baseline.incomeMonthly,
      needs_monthly: baseline.needsMonthly,
      flexible_monthly: baseline.flexibleMonthly,
      left_monthly: baseline.leftMonthly,
      credit_growth_monthly: baseline.creditGrowthMonthly,
      months_covered: baseline.months.length,
      partial: baseline.partial,
      observation: baseline.observation,
    },
    gamification,
  });
}
