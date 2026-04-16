"use client";

import { useEffect, useRef } from "react";
import { Briefcase, Home, LineChart } from "lucide-react";

const CARDS = [
  {
    icon: Briefcase,
    text: "New job, raise, or career change? Update your plan in minutes.",
  },
  {
    icon: Home,
    text: "Buying a home or starting a family? Ask Charlie how it affects your numbers.",
  },
  {
    icon: LineChart,
    text: "Market shift or rate change? Get context relevant to your portfolio.",
  },
];

export function AlwaysAvailableSection() {
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
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="always-available"
      className="bg-slate-950 px-6 py-20 lg:py-[120px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Always Available
        </p>
        <h2
          data-animate
          className="mb-4 font-display text-[28px] font-bold leading-tight text-white sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Life changes. Your plan should too.
        </h2>
        <p
          data-animate
          className="mb-14 max-w-2xl font-body text-[17px] leading-relaxed text-text-muted"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          This isn&apos;t a one-time document. It&apos;s a planning platform that
          knows your full financial picture and is there every time something
          changes.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.text}
                data-animate
                className="rounded-xl border border-white/[0.06] bg-slate-900 p-8"
                style={{ opacity: 0, transform: "translateY(16px)" }}
              >
                <Icon
                  className="mb-4 h-6 w-6 text-emerald"
                  strokeWidth={1.8}
                />
                <p className="font-body text-[15px] leading-relaxed text-text-inverse/90">
                  {card.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
