"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    num: 1,
    title: "Log this week",
    desc: "Tap in what you spent. A few seconds on your phone, no bank login. That one habit is the whole engine.",
  },
  {
    num: 2,
    title: "Snapshot your net worth each month",
    desc: "Update your balances once a month. Your Financial Health Score moves with what you log, so you can see the direction — not just the number.",
  },
  {
    num: 3,
    title: "Let Charlie explain the picture",
    desc: "On Progress, Charlie, your AI money guide, turns your numbers into a Progress Report and walks you through it in plain Canadian terms. Educational information, not advice — speak with a licensed financial advisor before implementing changes.",
  },
];

const LOOP_ROWS = [
  { label: "Spending logged", value: "This week", done: true },
  { label: "Net worth snapshot", value: "Saved for October", done: true },
  { label: "Weekly streak", value: "6 weeks", done: true },
  { label: "Progress Report", value: "Refreshed monthly", done: false },
] as const;

export function SolutionSection() {
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
    <section
      ref={sectionRef}
      id="how-it-works"
      className="bg-white px-6 py-20 lg:py-[120px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          How It Works
        </p>
        <h2
          data-animate
          className="mb-16 font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          A weekly loop. Not a one-time document.
        </h2>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Timeline */}
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-[15px] w-px bg-warm-200 lg:left-[15px]" />
            <div className="space-y-10">
              {STEPS.map((step) => (
                <div
                  key={step.num}
                  data-animate
                  className="relative pl-12"
                  style={{ opacity: 0, transform: "translateY(16px)" }}
                >
                  <div className="absolute left-0 top-0 flex h-[31px] w-[31px] items-center justify-center rounded-full bg-emerald font-display text-sm font-bold text-white">
                    {step.num}
                  </div>
                  <h3 className="mb-1 font-display text-lg font-semibold text-text-primary lg:text-xl">
                    {step.title}
                  </h3>
                  <p className="font-body text-[15px] leading-relaxed text-text-secondary">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly loop preview (illustrative, not a user's data) */}
          <div
            data-animate
            className="hidden rounded-2xl border border-white/[0.06] bg-slate-900 p-6 lg:block"
            style={{ opacity: 0, transform: "translateY(16px)" }}
            aria-hidden="true"
          >
            <div className="mb-5 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
            </div>
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald">
              This week
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-5xl font-extrabold tabular-nums text-white">
                  63
                </p>
                <p className="mt-1 font-body text-xs text-text-muted">
                  Financial Health Score
                </p>
              </div>
              <p className="rounded-full bg-emerald/15 px-3 py-1 font-display text-xs font-semibold text-emerald-soft">
                90-day +7
              </p>
            </div>
            <div className="mt-6 space-y-2">
              {LOOP_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg bg-white/[0.04] px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        row.done ? "bg-emerald" : "bg-white/20"
                      }`}
                    />
                    <span className="font-body text-[13px] text-text-inverse/85">
                      {row.label}
                    </span>
                  </div>
                  <span className="font-display text-xs font-semibold text-text-inverse/60">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 font-body text-[11px] text-text-muted">
              Illustration. The Score measures tracking consistency, not investment returns.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
