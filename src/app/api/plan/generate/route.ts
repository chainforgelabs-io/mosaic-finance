/**
 * Authenticated entrypoint: kicks off financial plan generation for the
 * current user (long-running; maxDuration 300s).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { triggerPlanGeneration } from '@/lib/plan/trigger-generation';
import { captureAPIError } from '@/lib/sentry';

export const maxDuration = 300;

export async function POST() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      console.error('[plan/generate] AUTH FAILED — no user from getUser()');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[plan/generate] Auth OK — user=${user.id}`);

    const result = await triggerPlanGeneration(user.id);

    if (!result.success) {
      if (result.statusCode === 429) {
        console.error(`[plan/generate] RATE LIMITED — user=${user.id}`);
      }
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    if (result.resumed) {
      console.log(
        `[plan/generate] Dedup — returning existing plan=${result.planId} (${result.status})`,
      );
      return NextResponse.json({
        planId: result.planId,
        status: result.status,
      });
    }

    console.log(
      `[plan/generate] Inserted generating row — planId=${result.planId}, returning 202`,
    );
    return NextResponse.json(
      { status: 'generating', planId: result.planId },
      { status: 202 },
    );
  } catch (error) {
    console.error('[plan/generate] UNHANDLED ERROR in sync phase:', error);
    captureAPIError(error, { route: 'plan/generate', step: 'sync_phase' });
    return NextResponse.json(
      { error: 'Internal server error', code: 'PLAN_GEN_FAILED' },
      { status: 500 },
    );
  }
}
