import { readFileSync } from "fs";
import { join } from "path";
import { resend } from "@/lib/resend/instance";
import {
  mosaicButton,
  mosaicCard,
  mosaicEmailHtml,
} from "@/lib/email/chrome";
import { sendMosaicEmail } from "@/lib/email/send";
import { nurtureIssue } from "@/lib/email/nurture-content";
import { getFoundingStatus } from "@/lib/founding";
import { daysRemaining } from "@/lib/email/trial";

const CIM_REVIEWER_EMAIL = process.env.CIM_REVIEWER_EMAIL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";

export async function sendApprovalQueueNotification(
  planId: string,
  isPriority: boolean,
) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "hello@mosaicfinance.ai",
    to: CIM_REVIEWER_EMAIL,
    subject: isPriority
      ? "[PRIORITY] New Progress Report in QA queue"
      : "New Progress Report in QA queue",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="font-size:12px;letter-spacing:3px;color:#EAB308;margin-bottom:8px;">MOSAIC FINANCE</div>
        <h2 style="color:#0f1923;margin-bottom:16px;">New Progress Report for QA</h2>
        <p>A new Progress Report has been generated and is available for optional internal QA review. The user already has access.</p>
        ${isPriority ? '<p style="color:#b91c1c;font-weight:700;">Priority — Complete tier</p>' : "<p>Standard</p>"}
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
  _userId: string,
  userEmail: string,
  planId: string,
) {
  await sendMosaicEmail({
    to: userEmail,
    subject: "Your Mosaic Finance Progress Report is Ready",
    list: "all",
    html: mosaicEmailHtml({
      email: userEmail,
      list: "all",
      title: "Your Progress Report is ready",
      preheader: "Open your report in Mosaic.",
      bodyHtml: mosaicCard(
        "It is in your dashboard",
        `<p style="margin:0;">Your Progress Report is available. It shows your current trajectory and educational options to learn about.</p>
         ${mosaicButton(`${APP_URL}/dashboard/plan/${planId}`, "View your Progress Report")}`,
      ),
    }),
  });
}

export async function sendPlanRejectionEmail(
  userEmail: string,
  notes: string,
) {
  await sendMosaicEmail({
    to: userEmail,
    subject: "Your Mosaic Finance Progress Report Needs Additional Information",
    list: "all",
    html: mosaicEmailHtml({
      email: userEmail,
      list: "all",
      title: "Additional information needed",
      bodyHtml: mosaicCard(
        "Reviewer notes",
        `<p style="margin:0 0 12px;">Your Progress Report was flagged as needing additional information before it can be finalized.</p>
         <p style="margin:0 0 12px;">${notes}</p>
         ${mosaicButton(`${APP_URL}/dashboard/fact-find`, "Update your information")}`,
      ),
    }),
  });
}

export async function sendWaitlistWelcomeEmail(userEmail: string) {
  const pdfPath = join(
    process.cwd(),
    "public",
    "guides",
    "rrsp-tfsa-fhsa-field-guide.pdf",
  );
  const pdfBuffer = readFileSync(pdfPath);

  await sendMosaicEmail({
    to: userEmail,
    subject: "Your RRSP, TFSA, and FHSA guide — welcome to Mosaic",
    list: "education",
    attachments: [
      {
        filename: "RRSP-TFSA-FHSA-Field-Guide.pdf",
        content: pdfBuffer,
      },
    ],
    html: mosaicEmailHtml({
      email: userEmail,
      list: "education",
      title: "Your guide is attached",
      preheader: "How RRSP, TFSA, and FHSA differ — plus a snapshot you can fill in.",
      bodyHtml: `${mosaicCard(
        "What is inside",
        `<p style="margin:0 0 10px;">Thanks for joining the Mosaic waitlist. Attached is your free guide: <strong>RRSP, TFSA, and FHSA — how the three Canadian accounts differ.</strong></p>
         <p style="margin:0;">It covers contribution room, tax treatment, and common tracking gaps, with a snapshot page you can fill in. Educational information, not a pick of which account to use.</p>`,
      )}
      ${mosaicCard(
        "What happens next",
        `<p style="margin:0;">You are on the list for early access to Mosaic — gamified financial tracking built for Canadian rules, with an AI guide that educates you about your money. Short follow-up notes will cover the mechanics, then how tracking works. You can unsubscribe from any email.</p>`,
      )}`,
    }),
  });
}

export async function sendTrialStartedEmail(userEmail: string) {
  await sendMosaicEmail({
    to: userEmail,
    subject: "Your 14-day Progress trial is on",
    list: "all",
    html: mosaicEmailHtml({
      email: userEmail,
      list: "all",
      title: "Charlie is unlocked for 14 days",
      preheader: "Two weeks of Progress — no credit card.",
      bodyHtml: mosaicCard(
        "What is included",
        `<p style="margin:0;">You have two weeks of Progress — fact-find, Progress Report, and Charlie included. No credit card yet. Tracking, budgets, and the Health Score stay free after the trial on Pulse.</p>
         ${mosaicButton(`${APP_URL}/onboarding`, "Start your fact-find")}`,
      ),
    }),
  });
}

export async function sendTrialDay10Email(
  userEmail: string,
  trialEndsAt?: string,
) {
  const days = trialEndsAt ? daysRemaining(trialEndsAt) : 4;
  const dayLabel = days === 1 ? "1 day" : `${days} days`;
  await sendMosaicEmail({
    to: userEmail,
    subject: `${dayLabel} left on your Progress trial`,
    list: "all",
    html: mosaicEmailHtml({
      email: userEmail,
      list: "all",
      title: "Keep Charlie in your corner",
      preheader: `${dayLabel} left on Progress. Pulse stays free either way.`,
      bodyHtml: mosaicCard(
        `${dayLabel} left`,
        `<p style="margin:0;">Your reverse trial ends in ${dayLabel}. Subscribe to Progress to keep your report refreshing and Charlie available. Tracking, budgets, and your Health Score stay free on Pulse either way.</p>
         ${mosaicButton(`${APP_URL}/dashboard/settings?tab=subscription`, "See Progress")}`,
      ),
    }),
  });
}

export async function sendTrialExpiredEmail(userEmail: string) {
  await sendMosaicEmail({
    to: userEmail,
    subject: "Your Progress trial ended — Pulse is still yours",
    list: "all",
    html: mosaicEmailHtml({
      email: userEmail,
      list: "all",
      title: "You are on Pulse now",
      preheader: "Your numbers, budgets, and streaks stay.",
      bodyHtml: mosaicCard(
        "Nothing tracking-related goes away",
        `<p style="margin:0;">Your numbers, budgets, and streaks stay. Upgrade anytime to unlock Charlie and a fresh Progress Report.</p>
         ${mosaicButton(`${APP_URL}/dashboard/settings?tab=subscription`, "See Progress")}`,
      ),
    }),
  });
}

export async function sendSubscriptionConfirmedEmail(
  userEmail: string,
  tier: string,
) {
  const label =
    tier === "mastery"
      ? "Mastery"
      : tier === "academy"
        ? "Mosaic Academy"
        : "Progress";
  await sendMosaicEmail({
    to: userEmail,
    subject: `Welcome to ${label}`,
    list: "all",
    html: mosaicEmailHtml({
      email: userEmail,
      list: "all",
      title: `${label} is active`,
      bodyHtml: mosaicCard(
        "You are in",
        `<p style="margin:0;">Thanks for subscribing. Your plan is live — first payment is covered by a 30-day no-questions refund.</p>
         ${mosaicButton(`${APP_URL}/dashboard`, "Open Mosaic")}`,
      ),
    }),
  });
}

export async function sendNurtureEmail(userEmail: string, step: number) {
  const issue = nurtureIssue(step);
  const founding = step === 2 ? await getFoundingStatus() : null;
  await sendMosaicEmail({
    to: userEmail,
    subject: issue.subject,
    list: step <= 1 ? "education" : "all",
    html: mosaicEmailHtml({
      email: userEmail,
      list: step <= 1 ? "education" : "all",
      kicker: step <= 1 ? "Education note" : "Mosaic Finance",
      title: issue.title,
      preheader: issue.preheader,
      bodyHtml: issue.body(APP_URL, founding),
    }),
  });
}

export { resend };
