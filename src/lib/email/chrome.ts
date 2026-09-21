import { type EmailList, unsubscribeUrl } from "@/lib/email/unsubscribe";

const LOGO_SVG = `<svg width="40" height="40" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="rotate(45 16 16)"><rect x="8" y="8" width="8" height="8" fill="#10B981"/><rect x="16" y="8" width="8" height="8" fill="#1F2937"/><rect x="8" y="16" width="8" height="8" fill="#1F2937"/><rect x="16" y="16" width="8" height="8" fill="#10B981"/><rect x="14" y="14" width="4" height="4" fill="#EAB308"/></g></svg>`;

export const EMAIL_DISCLAIMER =
  "Mosaic Finance is a financial tracking and education platform. This is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function mosaicButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 8px;">
    <tr>
      <td style="background:#0f1923;border-radius:6px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function mosaicCallout(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr>
      <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#166534;">
        ${html}
      </td>
    </tr>
  </table>`;
}

export function mosaicCard(title: string, innerHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#ffffff;border:1px solid #E8E8E0;border-radius:8px;">
    <tr>
      <td style="padding:20px 20px 8px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#0C0F17;">
        ${escapeHtml(title)}
      </td>
    </tr>
    <tr>
      <td style="padding:0 20px 20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
        ${innerHtml}
      </td>
    </tr>
  </table>`;
}

export interface MosaicEmailOptions {
  preheader?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
  email: string;
  list: EmailList;
}

/**
 * Table-based layout so Outlook iOS keeps 16px side padding.
 */
export function mosaicEmailHtml(opts: MosaicEmailOptions): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mosaicfinance.ai";
  const listUnsub = unsubscribeUrl(opts.email, opts.list);
  const allUnsub = unsubscribeUrl(opts.email, "all");
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>`
    : "";
  const kicker = opts.kicker
    ? `<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.14em;font-weight:700;color:#10B981;text-transform:uppercase;">${escapeHtml(opts.kicker)}</p>`
    : `<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.14em;font-weight:700;color:#10B981;text-transform:uppercase;">Mosaic Finance</p>`;
  const subtitle = opts.subtitle
    ? `<p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#9CA3AF;">${escapeHtml(opts.subtitle)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF8;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
          <tr>
            <td align="center" style="padding:8px 4px 20px;">
              <a href="${escapeHtml(appUrl)}" style="text-decoration:none;">${LOGO_SVG}</a>
              ${kicker}
              <h1 style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:22px;line-height:1.3;color:#1F2937;">${escapeHtml(opts.title)}</h1>
              ${subtitle}
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 4px 8px;font-family:Arial,sans-serif;font-size:11px;line-height:1.55;color:#9CA3AF;text-align:center;">
              <p style="margin:0 0 10px;">${EMAIL_DISCLAIMER}</p>
              <p style="margin:0;">
                <a href="${escapeHtml(listUnsub)}" style="color:#6B7280;text-decoration:underline;">Unsubscribe from this list</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(allUnsub)}" style="color:#6B7280;text-decoration:underline;">Unsubscribe from all emails</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
