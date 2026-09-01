import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: holdings, error } = await supabase
    .from('investment_holdings')
    .select('id, account_type, holdings, total_value, source, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from('financial_profiles')
    .select('annual_income, monthly_expenses, monthly_savings, emergency_fund_months, major_debts, financial_goals')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: fixedAssets } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('annual_income')
    .eq('id', user.id)
    .single();

  const { data: members } = await supabase
    .from('household_members')
    .select('annual_income')
    .eq('user_id', user.id);

  const primaryIncome = Number(userProfile?.annual_income) || 0;
  const membersIncome = (members ?? []).reduce(
    (sum, m) => sum + (Number(m.annual_income) || 0),
    0,
  );
  const householdIncome = primaryIncome + membersIncome;

  return NextResponse.json({
    holdings: holdings ?? [],
    financialProfile: profile ?? null,
    fixedAssets: fixedAssets ?? [],
    householdIncome: householdIncome > 0 ? householdIncome : null,
  });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  total_value: z.number().min(0),
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

  const { data, error } = await supabase
    .from('investment_holdings')
    .update({ total_value: parsed.data.total_value })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Holding not found or update failed' }, { status: 404 });
  }
  return NextResponse.json({ holding: data });
}
