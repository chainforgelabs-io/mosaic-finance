"use client";

import { useEffect, useRef } from "react";

const ROWS = [
  {
    title: "Not a robo-advisor",
    body: "Robo-advisors park your money passively. Mosaic is a tracking dashboard that helps you understand your whole financial picture.",
  },
  {
    title: "Not a calculator",
    body: "Calculators give generic numbers. Mosaic has a conversation that adapts to your situation, your province, your goals.",
  },
  {
    title: "Not financial advice",
    body: "Mosaic is a tracking and education tool. Charlie teaches you about your options — it is not licensed advice. Speak with a licensed financial advisor before implementing any changes.",
  },
  {
    title: "Works alongside your advisor",
    body: "If you have one, Mosaic gives you clarity between meetings. If you do not, Mosaic helps you track and learn so you are ready when you do speak with one.",
  },
];

export function PositioningSection() {
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
    <section ref={sectionRef} className="bg-white px-6 py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          How We&apos;re Different
        </p>
        <h2
          data-animate
          className="mb-14 font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          What Mosaic is not.
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {ROWS.map((row) => (
            <div
              key={row.title}
              data-animate
              className="rounded-xl border border-warm-200 bg-warm-50 p-8"
              style={{ opacity: 0, transform: "translateY(16px)" }}
            >
              <h3 className="mb-2 font-display text-lg font-semibold text-text-primary">
                {row.title}
              </h3>
              <p className="font-body text-[15px] leading-relaxed text-text-secondary">
                {row.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
