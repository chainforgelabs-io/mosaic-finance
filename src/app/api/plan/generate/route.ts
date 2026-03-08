import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { claudeChat, ClaudeTruncationError } from '@/lib/claude/client';
import { buildPlanGenerationPrompt } from '@/lib/claude/prompts/plan-generation';
import { getMarketContext } from '@/lib/market-data/alpha-vantage';
import { sendApprovalQueueNotification } from '@/lib/resend/client';
import { ratelimit } from '@/lib/ratelimit';
import { captureAPIError } from '@/lib/sentry';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('[plan/generate] AUTH FAILED — no user from getUser()');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[plan/generate] Auth OK — user=${user.id}`);

    const { success } = await ratelimit.planGeneration.limit(user.id);
    if (!success) {
      console.error(`[plan/generate] RATE LIMITED — user=${user.id}`);
      return NextResponse.json(
        {
          error:
            'Plan generation limit reached. Please try again later.',
        },
        { status: 429 },
      );
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('subscription_tier, alias, age, province, employment_type, family_structure')
      .eq('id', user.id)
      .single();
    console.log(`[plan/generate] userProfile: ${userProfile ? 'found' : 'missing'}`);

    const [financialProfile, holdings, riskProfile] = await Promise.all([
      supabase
        .from('financial_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('investment_holdings')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('risk_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);
    console.log(`[plan/generate] financialProfile: ${financialProfile.data ? 'found' : 'missing'}, holdings: ${holdings.data?.length ?? 0} rows, riskProfile: ${riskProfile.data ? 'found' : 'missing'}`);

    let marketContext = null;
    try {
      marketContext = await getMarketContext();
      console.log('[plan/generate] Market context fetched');
    } catch (err) {
      console.error('[plan/generate] Market context fetch failed:', err);
      captureAPIError(err, {
        route: 'plan/generate',
        userId: user.id,
        step: 'market_context_fetch',
      });
    }

    const { data: factFindSession } = await supabase
      .from('conversation_sessions')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('session_type', 'fact-find')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const factFindData = typeof factFindSession?.metadata === 'object'
      ? (factFindSession.metadata as Record<string, unknown>)?.extracted_data ?? null
      : null;
    console.log(`[plan/generate] factFindData: ${factFindData ? 'found' : 'missing'}`);

    const { data: householdMembers } = await supabase
      .from('household_members')
      .select('relationship, age, occupation, annual_income, is_dependant')
      .eq('user_id', user.id);
    console.log(`[plan/generate] householdMembers: ${householdMembers?.length ?? 0} rows`);

    const detectedFlags = (factFindData as Record<string, unknown> | null)?.detected_flags as Record<string, boolean> | undefined;
    const userFlags = {
      isDivorced: detectedFlags?.is_divorced_or_separated ?? false,
      isBusinessOwner: detectedFlags?.is_business_owner ?? false,
      isSelfEmployed: detectedFlags?.is_self_employed ?? (userProfile?.employment_type === 'self-employed'),
      hasUSProperty: detectedFlags?.has_us_property ?? false,
      hasUSIncome: detectedFlags?.has_us_income ?? false,
      isSnowbird: detectedFlags?.is_snowbird ?? false,
    };

    const userData = {
      profile: financialProfile.data,
      userProfile: userProfile ? {
        alias: userProfile.alias,
        age: userProfile.age,
        province: userProfile.province,
        employment_type: userProfile.employment_type,
        family_structure: userProfile.family_structure,
      } : null,
      holdings: holdings.data,
      riskProfile: riskProfile.data,
      factFindData,
      householdMembers: householdMembers ?? null,
      marketContext: marketContext as Record<string, unknown> | null,
      generatedAt: new Date().toISOString(),
      userFlags,
    };

    console.log(`[plan/generate] Calling Claude (maxTokens=16000)...`);
    const tClaude = Date.now();
    let planJson: string;
    try {
      planJson = await claudeChat(
        [{ role: 'user', content: 'Generate the complete financial plan now.' }],
        buildPlanGenerationPrompt(userData),
        { maxTokens: 16000, model: 'opus' },
      );
      console.log(`[plan/generate] Claude responded in ${((Date.now() - tClaude) / 1000).toFixed(1)}s — ${planJson.length} chars`);
    } catch (err) {
      const step = err instanceof ClaudeTruncationError ? 'claude_truncated' : 'claude_chat';
      console.error(`[plan/generate] CLAUDE FAILED (${step}) after ${((Date.now() - tClaude) / 1000).toFixed(1)}s:`, err);
      captureAPIError(err, {
        route: 'plan/generate',
        userId: user.id,
        step,
      });
      return NextResponse.json(
        { error: 'Plan generation failed — please try again', code: 'PLAN_GEN_FAILED' },
        { status: 500 },
      );
    }

    let planData: Record<string, unknown>;
    try {
      const jsonMatch = planJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');
      planData = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      console.log(`[plan/generate] JSON parsed OK — ${Object.keys(planData).length} top-level keys`);
    } catch (parseErr) {
      console.error(`[plan/generate] JSON PARSE FAILED — raw length=${planJson.length}, first 200 chars:`, planJson.slice(0, 200));
      captureAPIError(new Error('Plan generation produced invalid JSON'), {
        route: 'plan/generate',
        userId: user.id,
        step: 'json_parse',
        rawLength: planJson.length,
      });
      return NextResponse.json(
        { error: 'Plan generation failed — please try again', code: 'PLAN_GEN_FAILED' },
        { status: 500 },
      );
    }

    const { data: plan, error: planError } = await supabase
      .from('financial_plans')
      .insert({
        user_id: user.id,
        plan_data: planData,
        status: 'pending_review',
      })
      .select()
      .single();

    if (planError || !plan) {
      console.error('[plan/generate] DB INSERT FAILED:', planError);
      captureAPIError(planError ?? new Error('Plan insert returned null'), {
        route: 'plan/generate',
        userId: user.id,
        step: 'plan_insert',
      });
      return NextResponse.json(
        { error: 'Failed to save plan', code: 'PLAN_GEN_FAILED' },
        { status: 500 },
      );
    }
    console.log(`[plan/generate] Plan saved — id=${plan.id}`);

    const isPremium = userProfile?.subscription_tier === 'premium';
    const slaHours = isPremium ? 8 : 24;
    const slaDeadline = new Date(
      Date.now() + slaHours * 60 * 60 * 1000,
    ).toISOString();

    const { error: queueError } = await supabase
      .from('approval_queue')
      .insert({
        plan_id: plan.id,
        user_id: user.id,
        priority: isPremium ? 'priority' : 'standard',
        sla_deadline: slaDeadline,
      });

    if (queueError) {
      console.error('[plan/generate] Approval queue insert failed:', queueError);
      captureAPIError(queueError, {
        route: 'plan/generate',
        userId: user.id,
        planId: plan.id,
        step: 'approval_queue_insert',
      });
    }

    await sendApprovalQueueNotification(plan.id, isPremium).catch((err) => {
      console.error('[plan/generate] Approval notification failed:', err);
      captureAPIError(err, {
        route: 'plan/generate',
        userId: user.id,
        planId: plan.id,
        step: 'approval_notification',
      });
    });

    console.log(`[plan/generate] SUCCESS — planId=${plan.id}, total=${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return NextResponse.json({
      planId: plan.id,
      status: 'pending_review',
      estimatedDelivery: slaDeadline,
      message:
        'Your financial plan has been generated and submitted for CIM review. You will be notified when it is ready.',
    });
  } catch (error) {
    console.error(`[plan/generate] UNHANDLED ERROR after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, error);
    captureAPIError(error, { route: 'plan/generate', step: 'unknown' });
    return NextResponse.json(
      { error: 'Internal server error', code: 'PLAN_GEN_FAILED' },
      { status: 500 },
    );
  }
}
