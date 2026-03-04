import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { claudeChat } from '@/lib/claude/client';
import { buildPlanGenerationPrompt } from '@/lib/claude/prompts/plan-generation';
import { getMarketContext } from '@/lib/market-data/alpha-vantage';
import { sendApprovalQueueNotification } from '@/lib/resend/client';
import { ratelimit } from '@/lib/ratelimit';
import { captureAPIError } from '@/lib/sentry';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await ratelimit.planGeneration.limit(user.id);
    if (!success) {
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

    if (!financialProfile.data) {
      return NextResponse.json(
        { error: 'Financial profile is required before generating a plan. Please complete the fact-find first.' },
        { status: 400 },
      );
    }

    if (!riskProfile.data) {
      return NextResponse.json(
        { error: 'Risk profile is required before generating a plan. Please complete the risk assessment first.' },
        { status: 400 },
      );
    }

    let marketContext = null;
    try {
      marketContext = await getMarketContext();
    } catch (err) {
      captureAPIError(err, {
        route: 'plan/generate',
        userId: user.id,
        step: 'market_context_fetch',
      });
    }

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
      marketContext: marketContext as Record<string, unknown> | null,
      generatedAt: new Date().toISOString(),
    };

    const planJson = await claudeChat(
      [{ role: 'user', content: 'Generate the complete financial plan now.' }],
      buildPlanGenerationPrompt(userData),
      { maxTokens: 8000, model: 'opus' },
    );

    let planData;
    try {
      const jsonMatch = planJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');
      planData = JSON.parse(jsonMatch[0]);
    } catch {
      captureAPIError(new Error('Plan generation produced invalid JSON'), {
        route: 'plan/generate',
        userId: user.id,
        rawLength: planJson.length,
      });
      return NextResponse.json(
        { error: 'Plan generation failed — please try again' },
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
      captureAPIError(planError ?? new Error('Plan insert returned null'), {
        route: 'plan/generate',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to save plan' },
        { status: 500 },
      );
    }

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
      captureAPIError(queueError, {
        route: 'plan/generate',
        userId: user.id,
        planId: plan.id,
        step: 'approval_queue_insert',
      });
    }

    await sendApprovalQueueNotification(plan.id, isPremium).catch((err) =>
      captureAPIError(err, {
        route: 'plan/generate',
        userId: user.id,
        planId: plan.id,
        step: 'approval_notification',
      }),
    );

    return NextResponse.json({
      planId: plan.id,
      status: 'pending_review',
      estimatedDelivery: slaDeadline,
      message:
        'Your financial plan has been generated and submitted for CIM review. You will be notified when it is ready.',
    });
  } catch (error) {
    captureAPIError(error, { route: 'plan/generate' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
