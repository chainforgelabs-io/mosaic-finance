"use client";

import { useEffect, useRef } from "react";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { isLaunchLive } from "@/lib/config/launch";
import { TRIAL_COPY } from "@/lib/config/launch-surface";
import { GUARANTEE_NAME, GUARANTEE_SHORT, OFFER_NAME, OUTCOME_HEADLINE } from "@/lib/config/offer";
import Link from "next/link";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = el.querySelectorAll("[data-animate]");
    children.forEach((child, i) => {
      const htmlChild = child as HTMLElement;
      htmlChild.style.opacity = "0";
      htmlChild.style.transform = "translateY(16px)";
      setTimeout(() => {
        htmlChild.style.transition = "opacity 600ms ease-out, transform 600ms ease-out";
        htmlChild.style.opacity = "1";
        htmlChild.style.transform = "translateY(0)";
      }, 100 + i * 100);
    });
  }, []);

  return (
    <section
      id="waitlist"
      className="relative flex min-h-screen scroll-mt-20 items-center justify-center bg-slate-950 px-6 pb-16 pt-28 sm:pb-20 sm:pt-32"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    >
      <div ref={ref} className="mx-auto max-w-[720px] text-center">
        <p
          data-animate
          className="mb-3 inline-block rounded-full border border-emerald/30 bg-emerald/10 px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.08em] text-emerald"
        >
          {isLaunchLive()
            ? `Start free — ${TRIAL_COPY.days} of Progress included`
            : "Launching Soon · 200 founding spots"}
        </p>
        <p
          data-animate
          className="mb-6 font-body text-[13px] font-medium uppercase tracking-[0.08em] text-emerald"
        >
          {OFFER_NAME}
        </p>

        <h1
          data-animate
          className="mb-6 font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-[44px] lg:text-[56px]"
        >
          {OUTCOME_HEADLINE}
        </h1>

        <p
          data-animate
          className="mx-auto mb-10 max-w-[560px] font-body text-base leading-relaxed text-text-muted sm:text-lg"
        >
          Log weekly. Snapshot monthly. Your Financial Health Score shows the
          direction — educational, not advice.
        </p>

        <div data-animate className="mx-auto w-full max-w-[520px]">
          {isLaunchLive() ? (
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald px-6 py-3 font-display text-sm font-semibold text-white hover:bg-emerald-dark"
            >
              Start free
            </Link>
          ) : (
            <WaitlistForm source="hero" variant="hero" />
          )}
          <div className="mt-5 rounded-xl border border-emerald/30 bg-emerald/10 px-5 py-4 text-left">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-emerald">
              {GUARANTEE_NAME}
            </p>
            <p className="mt-1 font-display text-sm font-semibold leading-snug text-white sm:text-[15px]">
              {GUARANTEE_SHORT}
            </p>
          </div>
          <a
            href="#how-it-works"
            className="mt-4 inline-block font-display text-sm font-semibold text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            See how it works
          </a>
        </div>

        <p data-animate className="mt-6 font-body text-[13px] text-text-muted">
          Free to track · No card · Canadian data residency
        </p>
      </div>
    </section>
  );
}
