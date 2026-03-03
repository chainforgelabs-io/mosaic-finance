import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePDF } from '@/lib/pdf/report-generator';
import {
  sendPlanDeliveryEmail,
  sendPlanRejectionEmail,
} from '@/lib/resend/client';
import { captureAPIError } from '@/lib/sentry';
import { z } from 'zod';

const ApprovalActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'edit']),
  notes: z.string().max(5000).optional(),
  editedSections: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
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

    const parsed = ApprovalActionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { action, notes, editedSections } = parsed.data;

    const { data: queueItem, error: queueError } = await supabase
      .from('approval_queue')
      .select('*, financial_plans(*)')
      .eq('id', reportId)
      .single();

    if (queueError || !queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 },
      );
    }

    if (queueItem.status !== 'pending') {
      return NextResponse.json(
        { error: 'This item has already been reviewed' },
        { status: 400 },
      );
    }

    const { data: planOwner } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', queueItem.user_id)
      .single();

    let ownerEmail: string | null = null;
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(
        queueItem.user_id,
      );
      ownerEmail = authData?.user?.email ?? null;
    } catch {
      // admin API may not be available with anon key; email notification will be skipped
    }

    if (action === 'approve' || action === 'edit') {
      const existingPlanData = queueItem.financial_plans?.plan_data ?? {};
      const finalPlanData = editedSections
        ? { ...existingPlanData, ...editedSections }
        : existingPlanData;

      const pdfBuffer = await generatePDF(finalPlanData, queueItem.user_id);

      const pdfPath = `${queueItem.user_id}/${queueItem.plan_id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(pdfPath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        captureAPIError(uploadError, {
          route: 'approval/[reportId]',
          step: 'pdf_upload',
          reportId,
        });
      }

      await supabase
        .from('financial_plans')
        .update({
          status: 'delivered',
          cim_reviewer_id: user.id,
          cim_review_notes: notes ?? null,
          pdf_url: pdfPath,
          reviewed_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          plan_data: finalPlanData,
        })
        .eq('id', queueItem.plan_id);

      if (ownerEmail) {
        await sendPlanDeliveryEmail(
          queueItem.user_id,
          ownerEmail,
          queueItem.plan_id,
        ).catch((err) =>
          captureAPIError(err, {
            route: 'approval/[reportId]',
            step: 'delivery_email',
            reportId,
          }),
        );
      }
    }

    if (action === 'reject') {
      await supabase
        .from('financial_plans')
        .update({
          status: 'rejected',
          cim_reviewer_id: user.id,
          cim_review_notes: notes ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', queueItem.plan_id);

      if (ownerEmail && notes) {
        await sendPlanRejectionEmail(ownerEmail, notes).catch((err) =>
          captureAPIError(err, {
            route: 'approval/[reportId]',
            step: 'rejection_email',
            reportId,
          }),
        );
      }
    }

    await supabase
      .from('approval_queue')
      .update({
        status: action === 'reject' ? 'rejected' : 'approved',
        reviewer_id: user.id,
        reviewer_action: action,
        reviewer_notes: notes ?? null,
        edited_sections: editedSections ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    return NextResponse.json({
      success: true,
      action,
      planId: queueItem.plan_id,
    });
  } catch (error) {
    captureAPIError(error, { route: 'approval/[reportId]' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
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

    const { data: queueItem, error } = await supabase
      .from('approval_queue')
      .select(
        `
        *,
        financial_plans (
          id, user_id, version, status, plan_data, created_at
        ),
        user_profiles!approval_queue_user_id_fkey (
          alias, age, province, employment_type, family_structure, subscription_tier
        )
      `,
      )
      .eq('id', reportId)
      .single();

    if (error || !queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 },
      );
    }

    const { data: riskProfile } = await supabase
      .from('risk_profiles')
      .select('risk_score, conversational_insights')
      .eq('user_id', queueItem.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      ...queueItem,
      riskProfile,
    });
  } catch (error) {
    captureAPIError(error, { route: 'approval/[reportId]' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
