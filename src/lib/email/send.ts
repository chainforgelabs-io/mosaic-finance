import type { EmailList } from "@/lib/email/unsubscribe";
import { unsubscribeApiUrl } from "@/lib/email/unsubscribe";
import { FROM_EMAIL, resend } from "@/lib/resend/instance";

export interface MosaicSendInput {
  to: string;
  subject: string;
  html: string;
  list: EmailList;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendMosaicEmail(input: MosaicSendInput): Promise<void> {
  const unsub = unsubscribeApiUrl(input.to, input.list);
  const allUnsub = unsubscribeApiUrl(input.to, "all");
  await resend.emails.send({
    from: FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.attachments ? { attachments: input.attachments } : {}),
    headers: {
      "List-Unsubscribe": `<${unsub}>, <${allUnsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

export async function sendMosaicEmailEach(
  recipients: string[],
  build: (email: string) => { subject: string; html: string; list: EmailList },
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const email of recipients) {
    try {
      const payload = build(email);
      await sendMosaicEmail({ to: email, ...payload });
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { sent, failed };
}
