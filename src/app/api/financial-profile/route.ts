import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { upsertGoalsFromExtracted } from '@/lib/tracking/sync-goals';

const DebtSchema = z.object({
  type: z.string(),
  balance: z.number(),
  rate: z.number().optional(),
  monthly_payment: z.number().optional(),
});

const GoalSchema = z.object({
  type: z.string(),
  target_amount: z.number().optional(),
  target_date: z.string().optional(),
  priority: z.string().optional(),
});

const BodySchema = z.object({
  annual_income: z.number().optional(),
  household_total_income: z.number().optional(),
  monthly_expenses: z.number().optional(),
  monthly_savings: z.number().optional(),
  emergency_fund_months: z.number().optional(),
  retirement_target_age: z.number().optional(),
  debts: z.array(DebtSchema).optional(),
  goals: z.array(GoalSchema).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const annualIncome =
    d.household_total_income ?? d.annual_income ?? null;

  const majorDebts =
    d.debts && d.debts.length > 0
      ? d.debts.map((row) => ({
          type: row.type,
          amount: row.balance,
          balance: row.balance,
          rate: row.rate ?? null,
          monthly_payment: row.monthly_payment ?? null,
        }))
      : null;

  const financialGoals =
    d.goals && d.goals.length > 0
      ? d.goals.map((g) => ({
          goal: g.type,
          target_amount: g.target_amount ?? null,
          target_year: g.target_date ? parseInt(String(g.target_date), 10) || null : null,
        }))
      : null;

  const payload = {
    annual_income: annualIncome,
    monthly_expenses: d.monthly_expenses ?? null,
    monthly_savings: d.monthly_savings ?? null,
    emergency_fund_months: d.emergency_fund_months ?? null,
    retirement_target_age: d.retirement_target_age ?? null,
    major_debts: majorDebts,
    financial_goals: financialGoals,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('financial_profiles')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('financial_profiles')
      .update(payload)
      .eq('id', existing.id);

    if (error) {
      console.error('[financial-profile] update failed', error);
      return NextResponse.json({ error: 'Failed to save financial profile' }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from('financial_profiles').insert({
      user_id: user.id,
      ...payload,
    });

    if (error) {
      console.error('[financial-profile] insert failed', error);
      return NextResponse.json({ error: 'Failed to save financial profile' }, { status: 500 });
    }
  }

  if (d.goals && d.goals.length > 0) {
    await upsertGoalsFromExtracted(
      supabase,
      user.id,
      d.goals.map((g) => ({
        type: g.type,
        goal: g.type,
        target_amount: g.target_amount ?? null,
        target_date: g.target_date ?? null,
        priority: g.priority,
      })),
      'fact_find',
    );
  }

  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  monthly_expenses: z.number().optional(),
  monthly_savings: z.number().optional(),
  emergency_fund_months: z.number().optional(),
  debts: z.array(DebtSchema).optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.monthly_expenses != null) updates.monthly_expenses = parsed.data.monthly_expenses;
  if (parsed.data.monthly_savings != null) updates.monthly_savings = parsed.data.monthly_savings;
  if (parsed.data.emergency_fund_months != null) {
    updates.emergency_fund_months = parsed.data.emergency_fund_months;
  }
  if (parsed.data.debts) {
    updates.major_debts = parsed.data.debts.map((row) => ({
      type: row.type,
      amount: row.balance,
      balance: row.balance,
      rate: row.rate ?? null,
      monthly_payment: row.monthly_payment ?? null,
    }));
  }

  const { data: existing } = await supabase
    .from('financial_profiles')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('financial_profiles')
      .update(updates)
      .eq('id', existing.id);
    if (error) {
      return NextResponse.json({ error: 'Failed to update financial profile' }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from('financial_profiles').insert({
      user_id: user.id,
      ...updates,
    });
    if (error) {
      return NextResponse.json({ error: 'Failed to save financial profile' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
