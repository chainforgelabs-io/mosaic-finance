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

function mosaicWrap(title: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <div style="font-size:12px;letter-spacing:3px;color:#10B981;margin-bottom:8px;">MOSAIC FINANCE</div>
      <h2 style="color:#0f1923;margin-bottom:16px;">${title}</h2>
      ${body}
      <p style="margin-top:24px;font-size:11px;color:#999;line-height:1.5;">
        Mosaic Finance is a financial tracking and education platform.
        This is educational information, not financial advice.
      </p>
    </div>
  `;
}

export async function sendTrialStartedEmail(userEmail: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "Your 14-day Progress trial is on",
    html: mosaicWrap(
      "Charlie is unlocked for 14 days",
      `<p style="color:#333;line-height:1.6;">You have two weeks of Progress — fact-find, Progress Report, and Charlie included. No credit card yet.</p>
       <a href="${APP_URL}/onboarding" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">Start your fact-find</a>`,
    ),
  });
}

export async function sendTrialDay10Email(userEmail: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "4 days left on your Progress trial",
    html: mosaicWrap(
      "Keep Charlie in your corner",
      `<p style="color:#333;line-height:1.6;">Your reverse trial ends in four days. Subscribe to Progress to keep your report refreshing and Charlie available. Tracking, budgets, and your Health Score stay free either way.</p>
       <a href="${APP_URL}/dashboard/settings?tab=subscription" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">See Progress</a>`,
    ),
  });
}

export async function sendTrialExpiredEmail(userEmail: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "Your Progress trial ended — Pulse is still yours",
    html: mosaicWrap(
      "You're on Pulse now",
      `<p style="color:#333;line-height:1.6;">Your numbers, budgets, and streaks stay. Upgrade anytime to unlock Charlie and a fresh Progress Report.</p>
       <a href="${APP_URL}/dashboard/settings?tab=subscription" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">Upgrade</a>`,
    ),
  });
}

export async function sendSubscriptionConfirmedEmail(userEmail: string, tier: string) {
  const label = tier === "mastery" ? "Mastery" : tier === "academy" ? "Mosaic Academy" : "Progress";
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: `Welcome to ${label}`,
    html: mosaicWrap(
      `${label} is active`,
      `<p style="color:#333;line-height:1.6;">Thanks for subscribing. Your plan is live — first payment is covered by a 30-day no-questions refund.</p>
       <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">Open Mosaic</a>`,
    ),
  });
}

export async function sendNurtureEmail(
  userEmail: string,
  step: number,
) {
  const subjects = [
    "Canadian money mistakes that cost first-time savers",
    "How Mosaic tracks your money (without a spreadsheet)",
    "Founding Progress is $8/mo — lock it in",
    "Your 14-day Progress trial is waiting",
  ];
  const bodies = [
    `<p style="color:#333;line-height:1.6;">Mixing TFSA room with emergency cash, skipping the FHSA, and contributing to an RRSP in a low-income year are the most common Canadian mistakes we see. Your guide covers the framework — Mosaic turns it into a picture of <em>your</em> numbers.</p>`,
    `<p style="color:#333;line-height:1.6;">Mosaic is a gamified tracker: log spending, snapshot net worth, and Charlie (your AI money guide) explains the Canadian-rules picture. Education, not advice.</p>`,
    `<p style="color:#333;line-height:1.6;">The first 200 Progress members lock $8/mo (or $80/yr) for life. Standard is $17. Pulse stays free forever.</p>
     <a href="${APP_URL}/signup" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">Start free</a>`,
    `<p style="color:#333;line-height:1.6;">Create an account and you get 14 days of Progress — Charlie and a full report — with no credit card. After that, Pulse keeps tracking for free.</p>
     <a href="${APP_URL}/signup" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1923;color:white;text-decoration:none;border-radius:6px;">Start the trial</a>`,
  ];
  const idx = Math.max(0, Math.min(step, subjects.length - 1));
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: subjects[idx],
    html: mosaicWrap(subjects[idx], bodies[idx]),
  });
}

export { resend };
