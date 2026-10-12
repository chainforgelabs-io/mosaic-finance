"use client";

import { useEffect, useRef } from "react";
import { CalendarCheck, Gift, ShieldCheck } from "lucide-react";
import {
  GUARANTEE_ACTIONS,
  GUARANTEE_LONG,
  GUARANTEE_NAME,
  OFFER_BONUSES,
  OFFER_FOOTNOTE,
  OFFER_NAME,
  REFUND_WINDOW_COPY,
} from "@/lib/config/offer";
import { TRIAL_COPY } from "@/lib/config/launch-surface";

export function OfferSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const items = el.querySelectorAll("[data-animate]");
            items.forEach((item, i) => {
              const htmlItem = item as HTMLElement;
              setTimeout(() => {
                htmlItem.style.transition =
                  "opacity 400ms ease-out, transform 400ms ease-out";
                htmlItem.style.opacity = "1";
                htmlItem.style.transform = "translateY(0)";
              }, i * 80);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="offer"
      className="scroll-mt-20 bg-slate-950 px-6 py-20 lg:py-[120px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          The Offer
        </p>
        <h2
          data-animate
          className="mb-4 max-w-3xl font-display text-[28px] font-bold leading-tight text-white sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          {OFFER_NAME}
        </h2>
        <p
          data-animate
          className="mb-12 max-w-2xl font-body text-[17px] leading-relaxed text-text-muted"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Three small habits, ninety days, one Score that tells you the
          direction. Tracking is free forever. Progress adds Charlie and the
          Progress Report, with a {TRIAL_COPY.hyphen} trial and no card to start.
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* The work */}
          <div
            data-animate
            className="rounded-xl border border-white/[0.06] bg-slate-900 p-8"
            style={{ opacity: 0, transform: "translateY(16px)" }}
          >
            <CalendarCheck className="mb-4 h-6 w-6 text-emerald" strokeWidth={1.8} />
            <h3 className="mb-4 font-display text-lg font-semibold text-white">
              What you do
            </h3>
            <ul className="space-y-3">
              {GUARANTEE_ACTIONS.map((action) => (
                <li key={action.label} className="flex items-baseline justify-between gap-4">
                  <span className="font-body text-[15px] text-text-inverse/90">
                    {action.label}
                  </span>
                  <span className="shrink-0 font-display text-xs font-semibold uppercase tracking-wide text-emerald-soft">
                    {action.cadence}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 font-body text-sm leading-relaxed text-text-muted">
              That is the whole commitment. A few minutes a week on your phone.
            </p>
          </div>

          {/* The guarantee */}
          <div
            data-animate
            className="rounded-xl border border-emerald/40 bg-emerald/10 p-8"
            style={{ opacity: 0, transform: "translateY(16px)" }}
          >
            <ShieldCheck className="mb-4 h-6 w-6 text-emerald" strokeWidth={1.8} />
            <h3 className="mb-4 font-display text-lg font-semibold text-white">
              {GUARANTEE_NAME}
            </h3>
            <p className="font-body text-[15px] leading-relaxed text-text-inverse/90">
              {GUARANTEE_LONG}
            </p>
            <p className="mt-4 font-body text-sm text-emerald-soft">
              {REFUND_WINDOW_COPY}
            </p>
          </div>

          {/* The bonuses */}
          <div
            data-animate
            className="rounded-xl border border-white/[0.06] bg-slate-900 p-8"
            style={{ opacity: 0, transform: "translateY(16px)" }}
          >
            <Gift className="mb-4 h-6 w-6 text-emerald" strokeWidth={1.8} />
            <h3 className="mb-4 font-display text-lg font-semibold text-white">
              Included
            </h3>
            <ul className="space-y-4">
              {OFFER_BONUSES.map((bonus) => (
                <li key={bonus.title}>
                  <p className="font-display text-[15px] font-semibold text-white">
                    {bonus.title}
                  </p>
                  <p className="mt-0.5 font-body text-sm leading-relaxed text-text-muted">
                    {bonus.desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p
          data-animate
          className="mt-8 font-body text-[13px] text-text-muted"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          {OFFER_FOOTNOTE}
        </p>
      </div>
    </section>
  );
}
