import { mosaicButton, mosaicCallout, mosaicCard } from "@/lib/email/chrome";
import type { FoundingStatus } from "@/lib/founding";

export interface NurtureIssue {
  stepIndex: number;
  subject: string;
  preheader: string;
  title: string;
  body: (appUrl: string, founding?: FoundingStatus | null) => string;
}

/**
 * Waitlist follow-ups: scannable, one idea, one example, one link.
 * Steps 0–1 are education. Steps 2–3 are conversion and only send once launch is live.
 */

/** Gap between pre-launch education notes. The launch sequence stays on a 3-day gap. */
export const PRELAUNCH_HOLD_MS = 7 * 24 * 60 * 60 * 1000;

export const NURTURE_STEP_GAP_MS = 3 * 24 * 60 * 60 * 1000;
export const NURTURE_ISSUES: NurtureIssue[] = [
  {
    stepIndex: 0,
    subject: "Three Canadian money mistakes that show up in the tracker",
    preheader: "TFSA room, FHSA eligibility, and RRSP deductions — in plain language.",
    title: "Three tracking gaps we see a lot",
    body: (appUrl) =>
      mosaicCard(
        "Scan this in two minutes",
        `<ol style="margin:0;padding-left:18px;font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:#374151;">
          <li style="margin-bottom:10px;"><strong>Emergency cash inside a TFSA.</strong> Withdrawals are allowed. Room does not return until the next calendar year.</li>
          <li style="margin-bottom:10px;"><strong>Skipping the FHSA on the household picture.</strong> It is a separate bucket with its own room and first-home rules — easy to omit from a net-worth snapshot.</li>
          <li style="margin-bottom:0;"><strong>An RRSP deduction in a low-income year.</strong> The deduction is worth more in a higher-tax year, which is why the year you claim it belongs on the tracker, not just the contribution.</li>
        </ol>
        <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
          None of these is a recommendation. They are mechanics. The
          <a href="${appUrl}/calculators/rrsp-vs-tfsa" style="color:#059669;">RRSP vs TFSA calculator</a>
          and the attached guide walk through how the accounts differ.
        </p>`,
      ),
  },
  {
    stepIndex: 1,
    subject: "How Mosaic tracks your money (without a spreadsheet)",
    preheader: "Log spending, snapshot net worth, watch the Score. Pulse is free.",
    title: "The loop takes about ten minutes a week",
    body: (appUrl) =>
      `${mosaicCard(
        "Three tiles, one picture",
        `<p style="margin:0 0 10px;">Mosaic is a Canadian tracker — not a spreadsheet and not an advice product.</p>
        <ol style="margin:0;padding-left:18px;">
          <li style="margin-bottom:8px;"><strong>Spending.</strong> Log the week. Categories and budgets stay on Pulse, free.</li>
          <li style="margin-bottom:8px;"><strong>Net worth.</strong> One snapshot a month across cash, registered accounts, and debts.</li>
          <li style="margin-bottom:0;"><strong>Score.</strong> The Financial Health Score moves with those two habits — not with investment returns.</li>
        </ol>`,
      )}
      ${mosaicCard(
        "What Charlie is",
        `<p style="margin:0;">Charlie is your AI money guide. It explains the Canadian-rules picture on your numbers. Education, not advice. Included in the 14-day Progress trial, then on paid Progress.</p>`,
      )}
      ${mosaicButton(`${appUrl}/signup`, "Create a free Pulse account")}`,
  },
  {
    stepIndex: 2,
    subject: "Founding Progress is $8/mo — 200 spots",
    preheader: "Pulse stays free. Founding Progress locks $8/mo for life for the first 200.",
    title: "Founding Progress, if you want Charlie",
    body: (appUrl, founding) => {
      const remaining =
        founding && founding.open
          ? `${founding.remaining} of ${founding.cap} founding spots left.`
          : "Founding Progress is $8/mo (or $80/yr) for the first 200 members, locked for life.";
      return `${mosaicCard(
        "What you are looking at",
        `<p style="margin:0 0 10px;">${remaining}</p>
        <ul style="margin:0;padding-left:18px;">
          <li style="margin-bottom:8px;"><strong>Pulse</strong> — tracking, budgets, net worth, Score. Free forever.</li>
          <li style="margin-bottom:8px;"><strong>Progress</strong> — fact-find, Progress Report, Charlie. $17/mo standard, $8/mo founding.</li>
          <li style="margin-bottom:0;">14-day reverse trial of Progress with no credit card. 30-day refund after you subscribe.</li>
        </ul>`,
      )}
      ${mosaicCallout("No pitch on returns or dollars saved. Tracking stays free if you never upgrade.")}
      ${mosaicButton(`${appUrl}/signup`, "Start free")}`;
    },
  },
  {
    stepIndex: 3,
    subject: "Your 14-day Progress trial is waiting",
    preheader: "No credit card. Pulse keeps tracking after the two weeks.",
    title: "Two weeks of Progress, then Pulse still yours",
    body: (appUrl) =>
      `${mosaicCard(
        "If you create an account this week",
        `<ul style="margin:0;padding-left:18px;">
          <li style="margin-bottom:8px;">14 days of Charlie and a full Progress Report — no card.</li>
          <li style="margin-bottom:8px;">After that, Pulse keeps spending, budgets, net worth, and the Score.</li>
          <li style="margin-bottom:0;">Upgrade later only if you want the report refreshing and Charlie to stay.</li>
        </ul>`,
      )}
      ${mosaicButton(`${appUrl}/signup`, "Start the 14-day trial")}`,
  },
];

export function nurtureIssue(stepIndex: number): NurtureIssue {
  const idx = Math.max(0, Math.min(stepIndex, NURTURE_ISSUES.length - 1));
  return NURTURE_ISSUES[idx] ?? NURTURE_ISSUES[0];
}

/**
 * Education-only notes while accounts are closed. No signup link, no price, no trial.
 * They cycle until NEXT_PUBLIC_LAUNCH_MODE is live.
 */
export const PRELAUNCH_ISSUES: NurtureIssue[] = [
  {
    stepIndex: 0,
    subject: "TFSA room does not come back the same year",
    preheader: "A withdrawal is allowed. The room returns on January 1.",
    title: "Emergency cash inside a TFSA",
    body: (appUrl) =>
      mosaicCard(
        "The tracking gap",
        `<p style="margin:0 0 10px;">A TFSA withdrawal is allowed. The contribution room you used does not return until January 1 of the next calendar year.</p>
        <p style="margin:0 0 10px;">If emergency cash and long-term room sit in the same account, a withdrawal this year changes next year’s room. That is a mechanics fact, not a suggestion to move the cash.</p>
        <p style="margin:0;">Compare the account types on the
          <a href="${appUrl}/calculators/rrsp-vs-tfsa" style="color:#059669;">RRSP vs TFSA calculator</a>.
          Mosaic accounts are not open yet — you are still on the early-access list.</p>`,
      ),
  },
  {
    stepIndex: 1,
    subject: "CPP at 60 vs 65 — the reduction in one number",
    preheader: "0.6% per month before 65. A calculator, not a start-age pick.",
    title: "CPP timing, as a formula",
    body: (appUrl) =>
      mosaicCard(
        "What the reduction is",
        `<p style="margin:0 0 10px;">Canada Pension Plan can start from 60 to 70. Starting before 65 reduces the monthly amount by 0.6% for each month early — 36% at 60. Starting after 65 increases it by 0.7% per month.</p>
        <p style="margin:0 0 10px;">Longevity and other income change the picture. The formula itself does not tell you when to start.</p>
        <p style="margin:0;">Try a hypothetical amount on the
          <a href="${appUrl}/calculators/cpp-timing" style="color:#059669;">CPP timing calculator</a>.</p>`,
      ),
  },
  {
    stepIndex: 2,
    subject: "The FHSA is its own bucket",
    preheader: "Separate room and first-home rules — easy to leave off a net-worth snapshot.",
    title: "FHSA, not a line on the TFSA",
    body: (appUrl) =>
      mosaicCard(
        "Why it gets missed",
        `<p style="margin:0 0 10px;">The First Home Savings Account has its own contribution room and qualifying-withdrawal rules. Folding it into a TFSA total hides that room.</p>
        <p style="margin:0 0 10px;">This is how the account is structured. It is not a suggestion to open one.</p>
        <p style="margin:0;">Run a hypothetical on the
          <a href="${appUrl}/calculators/fhsa" style="color:#059669;">FHSA calculator</a>.</p>`,
      ),
  },
  {
    stepIndex: 3,
    subject: "What you will be able to track when Mosaic opens",
    preheader: "Accounts are not open yet. Pulse will keep tracking free.",
    title: "Still on the list",
    body: (appUrl) =>
      `${mosaicCard(
        "Not open yet",
        `<p style="margin:0 0 10px;">Mosaic is not taking accounts yet. You do not need to do anything to stay on the early-access list.</p>
        <ul style="margin:0;padding-left:18px;">
          <li style="margin-bottom:8px;"><strong>Spending.</strong> A weekly log, with categories and budgets.</li>
          <li style="margin-bottom:8px;"><strong>Net worth.</strong> A monthly snapshot across cash, registered accounts, and debts.</li>
          <li style="margin-bottom:0;"><strong>Score.</strong> The Financial Health Score follows those two habits. It does not measure investment returns.</li>
        </ul>`,
      )}
      ${mosaicCard(
        "Charlie",
        `<p style="margin:0;">Charlie, your AI money guide, explains the Canadian-rules picture. Education, not advice. That stays behind the launch — these notes are the series until then.</p>`,
      )}
      ${mosaicButton(`${appUrl}/calculators/rrsp-vs-tfsa`, "Open a calculator")}`,
  },
];

export function prelaunchIssue(index: number): NurtureIssue {
  const length = PRELAUNCH_ISSUES.length;
  const idx = ((index % length) + length) % length;
  return PRELAUNCH_ISSUES[idx] ?? PRELAUNCH_ISSUES[0];
}

/** Which pre-launch note to send, advancing one slot per hold window from signup. */
export function prelaunchIssueIndex(createdAt: Date, now: Date): number {
  const elapsed = Math.max(0, now.getTime() - createdAt.getTime());
  const slot = Math.floor(elapsed / PRELAUNCH_HOLD_MS);
  return slot % PRELAUNCH_ISSUES.length;
}

export type NurturePlan =
  | { action: "skip" }
  | { action: "sequence"; issueIndex: number; nextStep: number }
  | { action: "prelaunch"; issueIndex: number };

/**
 * Launch mode sends the signup sequence (issues 0–3) on a 3-day gap.
 * Waitlist mode sends issue 0 once, then weekly education notes, and does not
 * advance into the founding or trial emails.
 */
export function planNurtureSend(opts: {
  live: boolean;
  nurtureStep: number;
  createdAt: string | null;
  lastNurtureAt: string | null;
  now: Date;
}): NurturePlan {
  const step = Math.max(1, Number(opts.nurtureStep) || 1);
  if (step >= 5) return { action: "skip" };

  const last = opts.lastNurtureAt ? new Date(opts.lastNurtureAt) : null;
  const holding = !opts.live && step >= 2;
  const gap = holding ? PRELAUNCH_HOLD_MS : NURTURE_STEP_GAP_MS;
  if (last && last.getTime() > opts.now.getTime() - gap) return { action: "skip" };

  if (holding) {
    const created = opts.createdAt ? new Date(opts.createdAt) : opts.now;
    return {
      action: "prelaunch",
      issueIndex: prelaunchIssueIndex(created, opts.now),
    };
  }

  return { action: "sequence", issueIndex: step - 1, nextStep: step + 1 };
}
