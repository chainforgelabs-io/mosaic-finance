import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePDF } from '@/lib/pdf/report-generator';
import { ratelimit } from '@/lib/ratelimit';
import { captureAPIError } from '@/lib/sentry';

export const maxDuration = 60;

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

    const { success } = await ratelimit.pdfDownload.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Download limit reached. Please try again later.' },
        { status: 429 },
      );
    }

    const { data: plan, error } = await supabase
      .from('financial_plans')
      .select('id, plan_data, status, user_id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .in('status', ['pending_review', 'delivered'])
      .single();

    if (error || !plan) {
      return NextResponse.json(
        { error: 'Plan not found or still generating' },
        { status: 404 },
      );
    }

    const isDraft = plan.status === 'pending_review';

    const pdfBuffer = await generatePDF(
      plan.plan_data as Record<string, unknown>,
      user.id,
      { draft: isDraft },
    );

    const filename = isDraft
      ? `mosaic-draft-plan-${planId}.pdf`
      : `mosaic-financial-plan-${planId}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    captureAPIError(error, { route: 'plan/[planId]/draft-pdf' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
