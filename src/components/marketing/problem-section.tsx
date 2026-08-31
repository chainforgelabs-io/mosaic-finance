"use client";

import { useEffect, useRef } from "react";

const CARDS = [
  {
    title: "Too Expensive",
    stat: "$3,000–$10,000",
    subtitle: "per year for a financial advisor",
    body: "Professional advice costs more than most Canadians under 45 can justify — so they go without tracking or education.",
  },
  {
    title: "Too Passive",
    stat: "0 conversations",
    subtitle: "with your robo-advisor last year",
    body: "Robo-advisors manage your money. They don't help you track, learn, or see your whole picture.",
  },
  {
    title: "Too Generic",
    stat: "0 personalization",
    subtitle: "from a generic AI chat",
    body: "It doesn't know your RRSP balance, your province's tax rules, or your retirement timeline — and it asks for personal data you shouldn't be sharing.",
  },
];

export function ProblemSection() {
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
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-warm-50 px-6 py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          The Tracking Gap
        </p>
        <h2
          data-animate
          className="mb-3 max-w-3xl font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          5.4 million Canadians have no financial advisor. The rest are paying
          too much.
        </h2>
        <p
          data-animate
          className="mb-12 max-w-2xl font-body text-[17px] leading-relaxed text-text-secondary"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          You&apos;re making financial decisions worth tens of thousands of
          dollars with no clear picture of your trajectory. Every year without
          tracking your accounts, taxes, and retirement path is money left on
          the table.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div
              key={card.title}
              data-animate
              className="rounded-xl border border-warm-200 bg-white p-8"
              style={{ opacity: 0, transform: "translateY(16px)" }}
            >
              <p className="mb-1 font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
                {card.title}
              </p>
              <p className="mb-1 font-display text-[32px] font-bold leading-tight text-text-primary">
                {card.stat}
              </p>
              <p className="mb-3 font-body text-[15px] text-text-secondary">
                {card.subtitle}
              </p>
              <p className="font-body text-sm text-text-muted">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
