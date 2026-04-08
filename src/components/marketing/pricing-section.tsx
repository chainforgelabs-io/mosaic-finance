"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  formatTierPrice,
  type BillingInterval,
} from "@/lib/config/pricing";

const TIERS = [
  {
    id: "snapshot" as const,
    name: "Snapshot",
    tagline: "See where you stand",
    features: [
      "Financial Health Score",
      "Basic profile",
      "1 monthly check-in with Charlie (score-focused)",
      "No credit card",
    ],
    cta: "Start Free",
    style: "outlined" as const,
    highlighted: false,
    paid: false,
  },
  {
    id: "plan" as const,
    name: "Plan",
    tagline: "Your financial plan + professional review",
    features: [
      "Full conversational fact-find",
      "8-section plan + PDF",
      "5 conversations/month with Charlie",
      "Life event guidance",
      "6-month score refresh",
      "Professional review (48h)",
    ],
    cta: "Get Started",
    style: "dark" as const,
    highlighted: false,
    paid: true,
  },
  {
    id: "advisor" as const,
    name: "Advisor",
    tagline: "Your ongoing advisory relationship",
    features: [
      "Everything in Plan",
      "Unlimited conversations with Charlie",
      "Quarterly full reviews",
      "Same-day professional review",
      "Portfolio monitoring",
      "Tax year-end report",
    ],
    cta: "Get Started",
    style: "emerald" as const,
    highlighted: true,
    paid: true,
  },
];

function priceLabel(
  tierId: (typeof TIERS)[number]["id"],
  interval: BillingInterval,
): string {
  return formatTierPrice(tierId, interval);
}

export function PricingSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<BillingInterval>("monthly");

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
      id="pricing"
      className="bg-warm-50 px-6 py-20 lg:py-[120px]"
    >
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
          className="mb-8 font-body text-base text-text-secondary"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Every plan reviewed by a registered financial professional. Cancel
          anytime.
        </p>

        <div
          data-animate
          className="mb-10 flex flex-wrap items-center justify-center gap-3 sm:justify-start"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          <span className="font-body text-sm text-text-muted">Billing</span>
          <div className="inline-flex rounded-full border border-warm-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-4 py-1.5 font-display text-xs font-semibold transition-colors ${
                billing === "monthly"
                  ? "bg-slate-950 text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`rounded-full px-4 py-1.5 font-display text-xs font-semibold transition-colors ${
                billing === "annual"
                  ? "bg-slate-950 text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="mb-1 flex flex-col gap-0.5">
                <div className="flex items-baseline">
                  <span className="font-display text-4xl font-bold text-text-primary">
                    {priceLabel(tier.id, billing)}
                  </span>
                </div>
                {tier.paid && billing === "annual" && (
                  <span className="font-body text-[13px] text-text-muted">
                    Billed annually
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
          All prices in CAD. Plans auto-renew monthly or annually based on your
          choice.
        </p>
      </div>
    </section>
  );
}
