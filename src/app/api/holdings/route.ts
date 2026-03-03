import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateHoldingsSchema } from '@/lib/validators/holdings';
import { captureAPIError } from '@/lib/sentry';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = CreateHoldingsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { accountType, holdings, totalValue, source } = parsed.data;

    const { data: existing } = await supabase
      .from('investment_holdings')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_type', accountType)
      .single();

    if (existing) {
      const { data: updated, error } = await supabase
        .from('investment_holdings')
        .update({ holdings, total_value: totalValue, source })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        captureAPIError(error, {
          route: 'holdings',
          userId: user.id,
          action: 'update',
        });
        return NextResponse.json(
          { error: 'Failed to update holdings' },
          { status: 500 },
        );
      }

      return NextResponse.json(updated);
    }

    const { data: created, error } = await supabase
      .from('investment_holdings')
      .insert({
        user_id: user.id,
        account_type: accountType,
        holdings,
        total_value: totalValue,
        source,
      })
      .select()
      .single();

    if (error) {
      captureAPIError(error, {
        route: 'holdings',
        userId: user.id,
        action: 'create',
      });
      return NextResponse.json(
        { error: 'Failed to create holdings' },
        { status: 500 },
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    captureAPIError(error, { route: 'holdings' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: holdings, error } = await supabase
      .from('investment_holdings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      captureAPIError(error, {
        route: 'holdings',
        userId: user.id,
        action: 'list',
      });
      return NextResponse.json(
        { error: 'Failed to fetch holdings' },
        { status: 500 },
      );
    }

    return NextResponse.json(holdings);
  } catch (error) {
    captureAPIError(error, { route: 'holdings' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
