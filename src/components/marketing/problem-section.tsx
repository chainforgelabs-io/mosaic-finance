"use client";

import { useEffect, useRef } from "react";

const CARDS = [
  {
    title: "Too Expensive",
    stat: "$3,000–$10,000",
    subtitle: "per year for a human financial advisor",
    body: "That's more than most Canadians under 45 can justify — so they go without.",
  },
  {
    title: "Too Passive",
    stat: "0 conversations",
    subtitle: "with your robo-advisor last year",
    body: "Wealthsimple and Questrade manage your money. They don't plan with you.",
  },
  {
    title: "Too Generic",
    stat: "0 Canadian context",
    subtitle: "in ChatGPT's financial advice",
    body: "RRSP vs. TFSA? FHSA eligibility? CPP timing? You're on your own.",
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
          The Problem
        </p>
        <h2
          data-animate
          className="mb-3 max-w-2xl font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          14 million Canadians are making financial decisions alone.
        </h2>
        <p
          data-animate
          className="mb-12 max-w-xl font-body text-[17px] text-text-secondary"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Not because they don&apos;t care. Because the system wasn&apos;t
          built for them.
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
