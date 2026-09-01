"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    num: 1,
    title: "Tell Charlie about your financial situation",
    desc: "A warm, adaptive conversation covers your income, goals, debts, and accounts. One question at a time. No forms.",
  },
  {
    num: 2,
    title: "Get your Progress Report instantly",
    desc: "Net worth, trajectory, and educational context on tax accounts and retirement — based on your numbers and your province. Ready as soon as you finish.",
  },
  {
    num: 3,
    title: "Walk through it with Charlie",
    desc: "Charlie, your AI education guide, walks you through each section and explains your options. Speak with a licensed financial advisor before implementing any changes.",
  },
];

const FAKE_MESSAGES = [
  { from: "ai", text: "Hi! Let's start with a quick picture of where you are financially. What's your approximate annual income?" },
  { from: "user", text: "Around $85,000 before tax." },
  { from: "ai", text: "Great. And roughly how much do you save or invest each month?" },
  { from: "user", text: "About $800 goes into my TFSA." },
  { from: "ai", text: "Nice — that's a solid savings rate. Do you have any other accounts like an RRSP or FHSA?" },
];

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
          Track your money in three steps.
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

          {/* Conversation preview */}
          <div
            data-animate
            className="hidden rounded-2xl border border-white/[0.06] bg-slate-900 p-6 lg:block"
            style={{ opacity: 0, transform: "translateY(16px)" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
            </div>
            <div className="space-y-4">
              {FAKE_MESSAGES.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 font-body text-[13px] leading-relaxed ${
                      msg.from === "user"
                        ? "bg-emerald/15 text-emerald-soft"
                        : "bg-white/[0.06] text-text-inverse/80"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-xl bg-white/[0.06] px-4 py-3">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" />
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted [animation-delay:150ms]" />
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
