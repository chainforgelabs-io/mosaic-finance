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
      .select('id, plan_data, pdf_url, status, user_id')
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

    if (plan.pdf_url) {
      const { data: fileData } = await supabase.storage
        .from('reports')
        .download(plan.pdf_url);

      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="finova-financial-plan-${planId}.pdf"`,
            'Cache-Control': 'private, max-age=3600',
          },
        });
      }
    }

    const pdfBuffer = await generatePDF(
      plan.plan_data as Record<string, unknown>,
      user.id,
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="finova-financial-plan-${planId}.pdf"`,
      },
    });
  } catch (error) {
    captureAPIError(error, { route: 'plan/[planId]/pdf' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
