"use client";

import { useEffect, useRef } from "react";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

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
      className="relative flex min-h-screen scroll-mt-20 items-center justify-center bg-slate-950 px-6"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    >
      <div ref={ref} className="mx-auto max-w-[720px] text-center">
        <p
          data-animate
          className="mb-6 font-body text-[13px] font-medium uppercase tracking-[0.08em] text-emerald"
        >
          AI-Powered Financial Planning for Canadians
        </p>

        <h1
          data-animate
          className="mb-6 font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-[44px] lg:text-[56px]"
        >
          The $3,000/year advisor.
          <br />
          Now $17/month.
        </h1>

        <p
          data-animate
          className="mx-auto mb-10 max-w-[560px] font-body text-base leading-relaxed text-text-muted sm:text-lg"
        >
          A conversational AI that builds you a real financial plan —
          investment analysis, tax strategy, retirement projections — then walks
          you through it like an advisor would. Reviewed by a registered financial
          professional before you see it.
        </p>

        <div data-animate className="mx-auto w-full max-w-[520px]">
          <WaitlistForm source="hero" variant="hero" />
          <a
            href="#how-it-works"
            className="mt-4 inline-block font-display text-sm font-semibold text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            See how it works
          </a>
        </div>

        <p data-animate className="mt-6 font-body text-[13px] text-text-muted">
          No credit card required · Professionally reviewed · Privacy-first
        </p>
      </div>
    </section>
  );
}
