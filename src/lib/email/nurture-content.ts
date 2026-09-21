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
 * Steps 0–1 are education. Steps 2–3 are conversion for people who have not signed up.
 */
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
