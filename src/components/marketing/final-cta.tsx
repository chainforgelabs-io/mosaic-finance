"use client";

import { useEffect, useRef } from "react";

export function FinalCta() {
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
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-slate-950 px-6 py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[600px] text-center">
        <h2
          data-animate
          className="mb-4 font-display text-[28px] font-bold leading-tight text-white sm:text-[36px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Your financial plan is one conversation away.
        </h2>
        <p
          data-animate
          className="mb-8 font-body text-[17px] text-text-muted"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          No credit card. No personal information. Just a conversation.
        </p>
        <div data-animate style={{ opacity: 0, transform: "translateY(16px)" }}>
          <a
            href="/register"
            className="inline-block rounded-full bg-emerald px-10 py-4 font-display text-sm font-semibold text-white transition-colors hover:bg-emerald-dark"
          >
            Start Your Free Plan
          </a>
        </div>
        <p
          data-animate
          className="mt-6 font-body text-sm text-text-muted"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Questions?{" "}
          <a
            href="mailto:hello@finova.ai"
            className="underline transition-colors hover:text-text-inverse"
          >
            hello@finova.ai
          </a>
        </p>
      </div>
    </section>
  );
}
