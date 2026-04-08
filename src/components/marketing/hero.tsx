"use client";

import { useEffect, useRef } from "react";
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
      className="relative flex min-h-screen items-center justify-center bg-slate-950 px-6"
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

        <div data-animate className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-full bg-emerald px-8 py-3.5 font-display text-sm font-semibold text-white transition-colors hover:bg-emerald-dark"
          >
            Start Your Free Plan
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-white/20 px-8 py-3.5 font-display text-sm font-semibold text-white transition-colors hover:border-white/40"
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
