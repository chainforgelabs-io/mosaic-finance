import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import {
  applyUnsubscribe,
  verifyUnsubscribeToken,
} from "@/lib/email/unsubscribe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe — Mosaic Finance",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let heading = "We could not update your email preferences";
  let body =
    "That unsubscribe link is missing or invalid. If you still receive Mosaic emails, reply to one and ask to be removed, or use Settings → Notifications after you log in.";
  let ok = false;

  if (token) {
    const payload = verifyUnsubscribeToken(token);
    if (payload) {
      try {
        await applyUnsubscribe(payload.email, payload.list);
        ok = true;
        heading =
          payload.list === "all"
            ? "You are unsubscribed from Mosaic emails"
            : payload.list === "market"
              ? "You are unsubscribed from the weekly market brief"
              : "You are unsubscribed from education notes";
        body =
          payload.list === "all"
            ? "We will not send further marketing or education emails to this address. Product emails about a report you requested will still include an unsubscribe link."
            : "You can turn individual lists back on in Settings → Notifications after you log in. Or use Unsubscribe from all emails in any Mosaic message.";
      } catch {
        heading = "Something went wrong";
        body = "Please try the link again in a few minutes.";
      }
    }
  }

  return (
    <main>
      <Nav hideAuth />
      <section className="bg-slate-950 px-6 pb-16 pt-32">
        <div className="mx-auto max-w-[640px]">
          <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.1em] text-emerald">
            Email preferences
          </p>
          <h1 className="font-display text-[28px] font-bold leading-tight text-text-inverse sm:text-[36px]">
            {heading}
          </h1>
        </div>
      </section>
      <section className="bg-warm-50 px-6 py-16">
        <div className="mx-auto max-w-[640px]">
          <p className="font-body text-base leading-relaxed text-text-secondary">
            {body}
          </p>
          {ok && (
            <p className="mt-6 font-body text-sm text-text-muted">
              Pulse tracking stays free. This only changes email.
            </p>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
