import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { captureAPIError } from '@/lib/sentry';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: reviewer } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (reviewer?.role !== 'cim_reviewer' && reviewer?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: queue, error } = await supabase
      .from('approval_queue')
      .select(
        `
        id,
        plan_id,
        user_id,
        status,
        priority,
        submitted_at,
        sla_deadline,
        reviewer_id,
        reviewer_action,
        reviewer_notes,
        completed_at,
        financial_plans (
          id,
          plan_data,
          version,
          status,
          created_at
        ),
        user_profiles!approval_queue_user_id_fkey (
          alias,
          province,
          subscription_tier
        )
      `,
      )
      .order('sla_deadline', { ascending: true });

    if (error) {
      captureAPIError(error, { route: 'approval/queue', userId: user.id });
      return NextResponse.json(
        { error: 'Failed to load approval queue' },
        { status: 500 },
      );
    }

    const now = new Date();
    const enriched = (queue ?? []).map((item) => ({
      ...item,
      isOverdue:
        item.status === 'pending' &&
        item.sla_deadline &&
        new Date(item.sla_deadline) < now,
      isUrgent:
        item.status === 'pending' &&
        item.sla_deadline &&
        new Date(item.sla_deadline).getTime() - now.getTime() <
          4 * 60 * 60 * 1000,
    }));

    return NextResponse.json({
      queue: enriched,
      summary: {
        total: enriched.length,
        pending: enriched.filter((i) => i.status === 'pending').length,
        overdue: enriched.filter((i) => i.isOverdue).length,
        approved: enriched.filter((i) => i.status === 'approved').length,
        rejected: enriched.filter((i) => i.status === 'rejected').length,
      },
    });
  } catch (error) {
    captureAPIError(error, { route: 'approval/queue' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
