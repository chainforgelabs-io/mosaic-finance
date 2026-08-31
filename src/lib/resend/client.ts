import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { join } from 'path';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'hello@mosaicfinance.ai';
const CIM_REVIEWER_EMAIL = process.env.CIM_REVIEWER_EMAIL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mosaicfinance.ai';

export async function sendApprovalQueueNotification(
  planId: string,
  isPriority: boolean,
) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: CIM_REVIEWER_EMAIL,
    subject: isPriority
      ? '[PRIORITY] New Progress Report in QA queue'
      : 'New Progress Report in QA queue',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="font-size:12px;letter-spacing:3px;color:#EAB308;margin-bottom:8px;">MOSAIC FINANCE</div>
        <h2 style="color:#0f1923;margin-bottom:16px;">New Progress Report for QA</h2>
        <p>A new Progress Report has been generated and is available for optional internal QA review. The user already has access.</p>
        ${isPriority ? '<p style="color:#b91c1c;font-weight:700;">Priority — Complete tier</p>' : '<p>Standard</p>'}
        <a href="${APP_URL}/admin/approval-queue"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">
          Open QA Queue
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888;">Report ID: ${planId}</p>
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
    subject: 'Your Mosaic Finance Progress Report is Ready',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="font-size:12px;letter-spacing:3px;color:#EAB308;margin-bottom:8px;">MOSAIC FINANCE</div>
        <h2 style="color:#0f1923;margin-bottom:16px;">Your Progress Report is Ready</h2>
        <p>Great news — your Progress Report is now available. It shows your current trajectory and educational options to learn about.</p>
        <a href="${APP_URL}/dashboard/plan/${planId}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">
          View Your Progress Report
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888;">
          This is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.
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
    subject: 'Your Mosaic Finance Progress Report Needs Additional Information',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="font-size:12px;letter-spacing:3px;color:#EAB308;margin-bottom:8px;">MOSAIC FINANCE</div>
        <h2 style="color:#0f1923;margin-bottom:16px;">Additional Information Needed</h2>
        <p>Our team has flagged your Progress Report as needing additional information before it can be finalized.</p>
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

export async function sendWaitlistWelcomeEmail(userEmail: string) {
  const pdfPath = join(process.cwd(), 'public', 'guides', 'rrsp-tfsa-fhsa-framework.pdf');
  const pdfBuffer = readFileSync(pdfPath);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: 'Your RRSP vs TFSA vs FHSA guide — welcome to Mosaic',
    attachments: [
      {
        filename: 'RRSP-vs-TFSA-vs-FHSA-Framework.pdf',
        content: pdfBuffer,
      },
    ],
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="font-size:12px;letter-spacing:3px;color:#10B981;margin-bottom:8px;">MOSAIC FINANCE</div>
        <h2 style="color:#0f1923;margin-bottom:16px;">Your guide is attached</h2>
        <p style="color:#333;line-height:1.6;">
          Thanks for joining the Mosaic waitlist. Attached is your free guide:
          <strong>RRSP vs. TFSA vs. FHSA — The Decision Framework.</strong>
        </p>
        <p style="color:#333;line-height:1.6;">
          Inside you'll find the decision tree based on your income and tax bracket,
          which account to prioritize first, and the common allocation mistakes that
          cost Canadians thousands.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#166534;font-weight:600;">What happens next?</p>
          <p style="margin:8px 0 0;color:#333;line-height:1.6;">
            You're on the list for early access to Mosaic — gamified financial
            tracking built for Canadian rules, with an AI guide that educates
            you about your money. We'll email you as soon as we're
            ready to let you in.
          </p>
        </div>
        <p style="color:#333;line-height:1.6;">
          If you have any questions in the meantime, just reply to this email.
        </p>
        <p style="color:#333;line-height:1.6;">— The Mosaic Finance Team</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px;" />
        <p style="font-size:11px;color:#999;line-height:1.5;">
          Mosaic Finance is a financial tracking and education platform.
          This is educational information, not financial advice. Speak with a
          licensed financial advisor before implementing any changes.
        </p>
      </div>
    `,
  });
}

export { resend };
