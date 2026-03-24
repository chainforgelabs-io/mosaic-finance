import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { claudeChatStreaming, ClaudeTruncationError } from '@/lib/claude/client';
import { buildPlanGenerationPrompt } from '@/lib/claude/prompts/plan-generation';
import { getMarketContext } from '@/lib/market-data/alpha-vantage';
import { sendApprovalQueueNotification } from '@/lib/resend/client';
import { ratelimit } from '@/lib/ratelimit';
import { captureAPIError } from '@/lib/sentry';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
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

    const { success } = await ratelimit.planGeneration.limit(user.id);
    if (!success) {
      console.error(`[plan/generate] RATE LIMITED — user=${user.id}`);
      return NextResponse.json(
        { error: 'Plan generation limit reached. Please try again later.' },
        { status: 429 },
      );
    }

    const supabase = createServiceClient();

    const { data: existingPlan } = await supabase
      .from('financial_plans')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['generating', 'pending_review', 'approved', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingPlan) {
      console.log(`[plan/generate] Dedup — returning existing plan=${existingPlan.id} (${existingPlan.status})`);
      return NextResponse.json({
        planId: existingPlan.id,
        status: existingPlan.status,
      });
    }

    const userId = user.id;

    const { data: generatingPlan, error: insertError } = await supabase
      .from('financial_plans')
      .insert({
        user_id: userId,
        plan_data: {},
        status: 'generating',
      })
      .select('id')
      .single();

    if (insertError || !generatingPlan) {
      console.error('[plan/generate] Initial insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to start plan generation.' },
        { status: 500 },
      );
    }

    const planId = generatingPlan.id;
    console.log(`[plan/generate] Inserted generating row — planId=${planId}, returning 202`);

    after(async () => {
      const t0 = Date.now();
      const svc = createServiceClient();
      try {
        console.log(`[plan/generate:bg] Starting background generation for user=${userId}, planId=${planId}`);

        const { data: userProfile } = await svc
          .from('user_profiles')
          .select('subscription_tier, alias, age, province, employment_type, family_structure')
          .eq('id', userId)
          .single();
        console.log(`[plan/generate:bg] userProfile: ${userProfile ? 'found' : 'missing'}`);

        const [financialProfile, holdings, riskProfile] = await Promise.all([
          svc
            .from('financial_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          svc
            .from('investment_holdings')
            .select('*')
            .eq('user_id', userId),
          svc
            .from('risk_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
        ]);
        console.log(`[plan/generate:bg] financialProfile: ${financialProfile.data ? 'found' : 'missing'}, holdings: ${holdings.data?.length ?? 0} rows, riskProfile: ${riskProfile.data ? 'found' : 'missing'}`);

        let marketContext = null;
        try {
          marketContext = await getMarketContext();
          console.log('[plan/generate:bg] Market context fetched');
        } catch (err) {
          console.error('[plan/generate:bg] Market context fetch failed:', err);
          captureAPIError(err, { route: 'plan/generate:bg', userId, step: 'market_context_fetch' });
        }

        const { data: factFindSession } = await svc
          .from('conversation_sessions')
          .select('metadata')
          .eq('user_id', userId)
          .eq('session_type', 'fact-find')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const factFindData = typeof factFindSession?.metadata === 'object'
          ? (factFindSession.metadata as Record<string, unknown>)?.extracted_data ?? null
          : null;
        console.log(`[plan/generate:bg] factFindData: ${factFindData ? 'found' : 'missing'}`);

        const { data: householdMembers } = await svc
          .from('household_members')
          .select('relationship, age, occupation, annual_income, is_dependant')
          .eq('user_id', userId);
        console.log(`[plan/generate:bg] householdMembers: ${householdMembers?.length ?? 0} rows`);

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

        console.log(`[plan/generate:bg] Calling Claude via streaming (maxTokens=16000)...`);
        const tClaude = Date.now();
        let planJson: string;
        try {
          planJson = await claudeChatStreaming(
            [{ role: 'user', content: 'Generate the complete financial plan now.' }],
            buildPlanGenerationPrompt(userData),
            { maxTokens: 16000, model: 'opus' },
          );
          console.log(`[plan/generate:bg] Claude responded in ${((Date.now() - tClaude) / 1000).toFixed(1)}s — ${planJson.length} chars`);
        } catch (err) {
          const step = err instanceof ClaudeTruncationError ? 'claude_truncated' : 'claude_chat';
          console.error(`[plan/generate:bg] CLAUDE FAILED (${step}) after ${((Date.now() - tClaude) / 1000).toFixed(1)}s:`, err);
          captureAPIError(err, { route: 'plan/generate:bg', userId, step });
          await svc.from('financial_plans').update({ status: 'failed' }).eq('id', planId);
          return;
        }

        let planData: Record<string, unknown>;
        try {
          const jsonMatch = planJson.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON object found in response');
          planData = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          console.log(`[plan/generate:bg] JSON parsed OK — ${Object.keys(planData).length} top-level keys`);
        } catch (parseErr) {
          console.error(`[plan/generate:bg] JSON PARSE FAILED — raw length=${planJson.length}, first 200 chars:`, planJson.slice(0, 200));
          captureAPIError(new Error('Plan generation produced invalid JSON'), {
            route: 'plan/generate:bg',
            userId,
            step: 'json_parse',
            rawLength: planJson.length,
          });
          await svc.from('financial_plans').update({ status: 'failed' }).eq('id', planId);
          return;
        }

        const { error: updateError } = await svc
          .from('financial_plans')
          .update({
            plan_data: planData,
            status: 'pending_review',
          })
          .eq('id', planId);

        if (updateError) {
          console.error('[plan/generate:bg] DB UPDATE FAILED:', updateError);
          captureAPIError(updateError, {
            route: 'plan/generate:bg',
            userId,
            step: 'plan_update',
          });
          return;
        }
        console.log(`[plan/generate:bg] Plan updated — id=${planId}`);

        const isPremium = userProfile?.subscription_tier === 'premium';
        const slaHours = isPremium ? 8 : 24;
        const slaDeadline = new Date(
          Date.now() + slaHours * 60 * 60 * 1000,
        ).toISOString();

        const { error: queueError } = await svc
          .from('approval_queue')
          .insert({
            plan_id: planId,
            user_id: userId,
            priority: isPremium ? 'priority' : 'standard',
            sla_deadline: slaDeadline,
          });

        if (queueError) {
          console.error('[plan/generate:bg] Approval queue insert failed:', queueError);
          captureAPIError(queueError, {
            route: 'plan/generate:bg',
            userId,
            planId,
            step: 'approval_queue_insert',
          });
        }

        await sendApprovalQueueNotification(planId, isPremium).catch((err) => {
          console.error('[plan/generate:bg] Approval notification failed:', err);
          captureAPIError(err, {
            route: 'plan/generate:bg',
            userId,
            planId,
            step: 'approval_notification',
          });
        });

        console.log(`[plan/generate:bg] SUCCESS — planId=${planId}, total=${((Date.now() - t0) / 1000).toFixed(1)}s`);
      } catch (error) {
        console.error(`[plan/generate:bg] UNHANDLED ERROR after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, error);
        captureAPIError(error, { route: 'plan/generate:bg', userId, step: 'unknown' });
      }
    });

    return NextResponse.json({ status: 'generating', planId }, { status: 202 });
  } catch (error) {
    console.error('[plan/generate] UNHANDLED ERROR in sync phase:', error);
    captureAPIError(error, { route: 'plan/generate', step: 'sync_phase' });
    return NextResponse.json(
      { error: 'Internal server error', code: 'PLAN_GEN_FAILED' },
      { status: 500 },
    );
  }
}
