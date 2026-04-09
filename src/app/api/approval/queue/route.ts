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

    if (reviewer?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
      { data: queue, error: queueError },
      { data: allRows, error: statsError },
    ] = await Promise.all([
      supabase
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
          age,
          subscription_tier
        )
      `,
        )
        .eq('status', 'pending')
        .order('sla_deadline', { ascending: true }),
      supabase.from('approval_queue').select('status, sla_deadline, completed_at'),
    ]);

    if (queueError) {
      captureAPIError(queueError, { route: 'approval/queue', userId: user.id });
      return NextResponse.json(
        { error: 'Failed to load approval queue' },
        { status: 500 },
      );
    }
    if (statsError) {
      captureAPIError(statsError, { route: 'approval/queue', userId: user.id, step: 'stats' });
    }

    const userIds = [...new Set((queue ?? []).map((q) => q.user_id as string))];
    const riskByUser: Record<string, { risk_score: string }> = {};
    if (userIds.length > 0) {
      const { data: riskRows } = await supabase
        .from('risk_profiles')
        .select('user_id, risk_score, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });
      for (const row of riskRows ?? []) {
        if (!riskByUser[row.user_id]) {
          riskByUser[row.user_id] = { risk_score: row.risk_score };
        }
      }
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const enriched = (queue ?? []).map((item) => ({
      ...item,
      risk_profile: riskByUser[item.user_id as string] ?? null,
      isOverdue:
        item.status === 'pending' &&
        item.sla_deadline &&
        new Date(item.sla_deadline as string) < now,
      isUrgent:
        item.status === 'pending' &&
        item.sla_deadline &&
        new Date(item.sla_deadline as string).getTime() - now.getTime() <
          4 * 60 * 60 * 1000,
    }));

    const stats = allRows ?? [];
    const pendingList = enriched;
    const dueToday = pendingList.filter((i) => {
      if (!i.sla_deadline) return false;
      const d = new Date(i.sla_deadline as string);
      return d >= now && d <= endOfToday;
    }).length;

    const completedToday = stats.filter((row) => {
      if (!row.completed_at) return false;
      const c = new Date(row.completed_at);
      return c >= startOfToday && c <= endOfToday;
    }).length;

    return NextResponse.json({
      queue: enriched,
      summary: {
        total: pendingList.length,
        pending: pendingList.length,
        overdue: pendingList.filter((i) => i.isOverdue).length,
        dueToday,
        approved: stats.filter((r) => r.status === 'approved').length,
        rejected: stats.filter((r) => r.status === 'rejected').length,
        completedToday,
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
