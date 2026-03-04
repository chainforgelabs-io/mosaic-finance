import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateRiskProfileSchema } from '@/lib/validators/risk-profile';
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

    const parsed = CreateRiskProfileSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      riskScore,
      questionnaireResponses,
      conversationalInsights,
      confirmedByUser,
    } = parsed.data;

    const { data: profile, error } = await supabase
      .from('risk_profiles')
      .insert({
        user_id: user.id,
        risk_score: riskScore,
        questionnaire_responses: questionnaireResponses ?? null,
        conversational_insights: conversationalInsights ?? null,
        confirmed_by_user: confirmedByUser,
      })
      .select()
      .single();

    if (error) {
      captureAPIError(error, {
        route: 'risk-profile',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to save risk profile' },
        { status: 500 },
      );
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    captureAPIError(error, { route: 'risk-profile' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
