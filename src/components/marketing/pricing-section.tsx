"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  formatTierPrice,
  TIER_CTA,
  TIER_FEATURES,
  TIER_LABELS,
  TIER_PROMISE,
  type BillingInterval,
} from "@/lib/config/pricing";
import { isLaunchLive } from "@/lib/config/launch";
import type { Tier } from "@/types";

const TIERS: {
  id: Tier;
  style: "outlined" | "dark" | "emerald";
  highlighted: boolean;
  paid: boolean;
}[] = [
  { id: "pulse", style: "outlined", highlighted: false, paid: false },
  { id: "progress", style: "dark", highlighted: false, paid: true },
  { id: "mastery", style: "emerald", highlighted: true, paid: true },
];

function priceLabel(tierId: Tier, interval: BillingInterval, founding: boolean): string {
  return formatTierPrice(tierId, interval, { founding: founding && tierId === "progress" });
}

export function PricingSection({ ctaHref = "/waitlist" }: { ctaHref?: string } = {}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const [founding, setFounding] = useState({ open: false, remaining: 0, cap: 200 });

  useEffect(() => {
    void fetch("/api/founding/status")
      .then((r) => r.json())
      .then((d) =>
        setFounding({
          open: Boolean(d.open),
          remaining: Number(d.remaining ?? 0),
          cap: Number(d.cap ?? 200),
        }),
      )
      .catch(() => undefined);
  }, []);

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
      className="bg-white px-6 py-20 lg:py-[120px]"
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
          Free tracks. Paid thinks.
        </h2>
        <p
          data-animate
          className="mb-8 font-body text-base text-text-secondary"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          14-day reverse trial of Progress, no card. First payment refundable for 30 days.
          Consistency Guarantee on 90 days of weekly logs + monthly snapshots.
          {founding.open
            ? ` ${founding.remaining} founding Progress spots left at $8/mo.`
            : ""}
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
              key={tier.id}
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
                {TIER_LABELS[tier.id]}
              </p>
              <div className="mb-1 flex flex-col gap-0.5">
                <div className="flex items-baseline">
                  <span className="font-display text-4xl font-bold text-text-primary">
                    {priceLabel(tier.id, billing, founding.open)}
                  </span>
                </div>
                {tier.id === "progress" && founding.open && (
                  <span className="font-body text-[13px] text-text-muted line-through">
                    {formatTierPrice("progress", billing)}
                  </span>
                )}
                {tier.paid && billing === "annual" && (
                  <span className="font-body text-[13px] text-text-muted">
                    Billed annually
                  </span>
                )}
              </div>
              <p className="mb-6 font-body text-sm text-text-muted">
                {TIER_PROMISE[tier.id]}
              </p>
              <ul className="mb-8 space-y-2.5">
                {TIER_FEATURES[tier.id].map((f) => (
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
                href={
                  isLaunchLive() && tier.id !== "pulse"
                    ? `/signup?plan=${tier.id}`
                    : ctaHref
                }
                className={`block w-full rounded-full py-2.5 text-center font-display text-sm font-semibold transition-colors ${
                  tier.style === "emerald"
                    ? "bg-emerald text-white hover:bg-emerald-dark"
                    : tier.style === "dark"
                      ? "bg-slate-950 text-white hover:bg-slate-900"
                      : "border border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white"
                }`}
              >
                {TIER_CTA[tier.id]}
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
