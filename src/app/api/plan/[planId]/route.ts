import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { captureAPIError } from '@/lib/sentry';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RLS enforces user_own data + delivered-only access, but we add
    // explicit filters as defense-in-depth.
    const { data: plan, error } = await supabase
      .from('financial_plans')
      .select(
        'id, version, status, plan_data, pdf_url, delivered_at, created_at',
      )
      .eq('id', planId)
      .eq('user_id', user.id)
      .eq('status', 'delivered')
      .single();

    if (error || !plan) {
      return NextResponse.json(
        { error: 'Plan not found or not yet approved' },
        { status: 404 },
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    captureAPIError(error, { route: 'plan/[planId]' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
