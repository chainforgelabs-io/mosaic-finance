import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'plans@finova.ai';
const CIM_REVIEWER_EMAIL = process.env.CIM_REVIEWER_EMAIL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://finova.ai';

export async function sendApprovalQueueNotification(
  planId: string,
  isPriority: boolean,
) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: CIM_REVIEWER_EMAIL,
    subject: isPriority
      ? '[PRIORITY] New financial plan awaiting CIM review'
      : 'New financial plan awaiting CIM review',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="font-size:12px;letter-spacing:3px;color:#c9aa71;margin-bottom:8px;">FINOVA AI</div>
        <h2 style="color:#0f1923;margin-bottom:16px;">New Plan Pending Review</h2>
        <p>A new financial plan has been submitted for CIM review.</p>
        ${isPriority ? '<p style="color:#b91c1c;font-weight:700;">⚡ PRIORITY — Premium client (8-hour SLA)</p>' : '<p>Standard review — 24-hour SLA</p>'}
        <a href="${APP_URL}/admin/approval-queue"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">
          Open Approval Queue
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888;">Plan ID: ${planId}</p>
      </div>
    `,
  });
}

export async function sendPlanDeliveryEmail(
  userId: string,
  userEmail: string,
  planId: string,
) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: 'Your Finova AI Financial Plan is Ready',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="font-size:12px;letter-spacing:3px;color:#c9aa71;margin-bottom:8px;">FINOVA AI</div>
        <h2 style="color:#0f1923;margin-bottom:16px;">Your Financial Plan is Ready</h2>
        <p>Great news — your personalized financial plan has been reviewed by a CIM-designated professional and is now available.</p>
        <a href="${APP_URL}/dashboard/plan/${planId}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">
          View Your Plan
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888;">
          This plan was reviewed by a CIM-designated professional. It does not constitute registered investment advice.
        </p>
      </div>
    `,
  });
}

export async function sendPlanRejectionEmail(
  userEmail: string,
  notes: string,
) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: 'Your Finova AI Plan Requires Additional Information',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="font-size:12px;letter-spacing:3px;color:#c9aa71;margin-bottom:8px;">FINOVA AI</div>
        <h2 style="color:#0f1923;margin-bottom:16px;">Additional Information Needed</h2>
        <p>Our CIM-designated reviewer has flagged your plan as needing additional information before it can be finalized.</p>
        <div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="font-weight:700;margin-bottom:8px;">Reviewer Notes:</p>
          <p>${notes}</p>
        </div>
        <a href="${APP_URL}/dashboard/fact-find"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">
          Update Your Information
        </a>
      </div>
    `,
  });
}

export { resend };
