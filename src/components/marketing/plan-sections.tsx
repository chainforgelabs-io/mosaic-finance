"use client";

import { useEffect, useRef } from "react";
import {
  BarChart3,
  Target,
  TrendingUp,
  DollarSign,
  Building,
  Shield,
  Newspaper,
  Map,
} from "lucide-react";

const SECTIONS = [
  {
    icon: BarChart3,
    title: "Financial Health Score",
    desc: "Net worth, cash flow, savings rate, 1–100 score",
  },
  {
    icon: Target,
    title: "Retirement Readiness",
    desc: "Your number, the gap, CPP/OAS timing, account strategy",
  },
  {
    icon: TrendingUp,
    title: "Investment Blueprint",
    desc: "Asset allocation, ETF picks with MERs, rebalancing schedule",
  },
  {
    icon: DollarSign,
    title: "Tax Efficiency",
    desc: "RRSP room, TFSA strategy, FHSA, tax-loss harvesting",
  },
  {
    icon: Building,
    title: "Debt Elimination",
    desc: "Avalanche vs. snowball, payoff timeline, refinancing analysis",
  },
  {
    icon: Shield,
    title: "Insurance Audit",
    desc: "Life, disability, critical illness gap analysis",
  },
  {
    icon: Newspaper,
    title: "Market Context",
    desc: "Weekly macro commentary relevant to your portfolio",
  },
  {
    icon: Map,
    title: "Lifetime Roadmap",
    desc: "Decade-by-decade priorities, financial independence number",
  },
];

export function PlanSections() {
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
    <section ref={sectionRef} className="bg-slate-950 px-6 py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Your Plan
        </p>
        <h2
          data-animate
          className="mb-14 font-display text-[28px] font-bold leading-tight text-white sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Eight sections. Zero guesswork.
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                data-animate
                className="rounded-xl border border-white/[0.06] bg-slate-900 p-8"
                style={{ opacity: 0, transform: "translateY(16px)" }}
              >
                <Icon className="mb-4 h-5 w-5 text-emerald" strokeWidth={1.8} />
                <h3 className="mb-1 font-display text-[17px] font-semibold text-white">
                  {section.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-text-muted">
                  {section.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
