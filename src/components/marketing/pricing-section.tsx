"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { TIER_PRICING } from "@/lib/config/pricing";

const TIERS = [
  {
    name: "Free",
    price: TIER_PRICING.free.price,
    period: TIER_PRICING.free.period,
    tagline: "See where you stand",
    features: [
      "One financial health diagnostic",
      "Basic profile",
      "No credit card",
    ],
    cta: "Start Free",
    style: "outlined" as const,
    highlighted: false,
  },
  {
    name: "Essential",
    price: TIER_PRICING.essential.price,
    period: TIER_PRICING.essential.period,
    tagline: "Your complete financial plan",
    features: [
      "Full conversational fact-find",
      "8-section plan",
      "Monthly market update",
      "PDF download",
      "Professional review",
    ],
    cta: "Get Started",
    style: "dark" as const,
    highlighted: false,
  },
  {
    name: "Pro",
    price: TIER_PRICING.pro.price,
    period: TIER_PRICING.pro.period,
    tagline: "Stay on track",
    features: [
      "Everything in Essential",
      "Unlimited plan updates",
      "Portfolio monitoring",
      "Debt payoff tracker",
      "Quarterly re-plan",
    ],
    cta: "Get Started",
    style: "emerald" as const,
    highlighted: true,
  },
  {
    name: "Premium",
    price: TIER_PRICING.premium.price,
    period: TIER_PRICING.premium.period,
    tagline: "Full experience",
    features: [
      "Everything in Pro",
      "Voice interface",
      "Same-day professional review",
      "Tax year-end report",
    ],
    cta: "Get Started",
    style: "dark" as const,
    highlighted: false,
  },
];

export function PricingSection() {
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
                htmlItem.style.transition = "opacity 400ms ease-out, transform 400ms ease-out";
                htmlItem.style.opacity = "1";
                htmlItem.style.transform = "translateY(0)";
              }, i * 80);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="pricing" className="bg-warm-50 px-6 py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Pricing
        </p>
        <h2
          data-animate
          className="mb-3 font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Less than your monthly streaming bill.
        </h2>
        <p
          data-animate
          className="mb-14 font-body text-base text-text-secondary"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Every plan reviewed by a registered financial professional. Cancel anytime.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              data-animate
              className={`relative rounded-xl border bg-white p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
                tier.highlighted
                  ? "border-emerald"
                  : "border-warm-200"
              }`}
              style={{ opacity: 0, transform: "translateY(16px)" }}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald px-3 py-0.5 font-display text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <p className="mb-1 font-display text-sm font-semibold text-text-secondary">
                {tier.name}
              </p>
              <div className="mb-1 flex items-baseline">
                <span className="font-display text-4xl font-bold text-text-primary">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="ml-0.5 font-body text-sm text-text-muted">
                    {tier.period}
                  </span>
                )}
              </div>
              <p className="mb-6 font-body text-sm text-text-muted">
                {tier.tagline}
              </p>
              <ul className="mb-8 space-y-2.5">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 font-body text-sm text-text-secondary"
                  >
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block w-full rounded-full py-2.5 text-center font-display text-sm font-semibold transition-colors ${
                  tier.style === "emerald"
                    ? "bg-emerald text-white hover:bg-emerald-dark"
                    : tier.style === "dark"
                      ? "bg-slate-950 text-white hover:bg-slate-900"
                      : "border border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p
          data-animate
          className="mt-8 text-center font-body text-[13px] text-text-muted"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          All prices in CAD. Plans auto-renew monthly.
        </p>
      </div>
    </section>
  );
}
