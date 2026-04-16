"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "Is this financial planning or financial advice?",
    a: "Mosaic provides financial planning and education. It does not constitute registered investment advice. Every plan is reviewed by a Registered Financial Professional, but Mosaic does not hold itself out as a registered advisor.",
  },
  {
    q: "What data do you collect?",
    a: "No legal name, no SIN, and no account numbers. We use alias-based profiles with encrypted data and Canadian data residency.",
  },
  {
    q: "When do I get charged?",
    a: "Not until we launch. Join the waitlist to lock in Founding Member pricing.",
  },
  {
    q: "How does professional validation work?",
    a: "Every plan is reviewed by a Registered Financial Professional before delivery. This is a structural requirement, not a disclaimer.",
  },
  {
    q: "Can I update my plan later?",
    a: "Yes. Life changes — so should your plan. Update anytime from your dashboard.",
  },
];

export function FaqSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
      id="faq"
      className="bg-warm-50 px-6 py-20 lg:py-[120px]"
    >
      <div className="mx-auto max-w-[720px]">
        <p
          data-animate
          className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          FAQ
        </p>
        <h2
          data-animate
          className="mb-10 text-center font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Common questions.
        </h2>

        <div className="space-y-2">
          {ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={item.q}
                data-animate
                className="overflow-hidden rounded-xl border border-warm-200 bg-white"
                style={{ opacity: 0, transform: "translateY(16px)" }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-[15px] font-semibold text-text-primary transition-colors hover:bg-warm-50 sm:text-base"
                  aria-expanded={isOpen}
                >
                  {item.q}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-text-muted transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-warm-100 px-5 pb-4 pt-0">
                    <p className="pt-3 font-body text-[15px] leading-relaxed text-text-secondary">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
