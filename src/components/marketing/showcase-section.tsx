"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const SHOWCASES = [
  {
    label: "Tell Charlie about your financial picture",
    image: "/assets/Onboarding - Factfind.svg",
    alt: "Fact-find onboarding screen",
  },
  {
    label: "Get a personalized plan in under 30 minutes",
    image: "/assets/Financial Plan Report - Executive Summary.svg",
    alt: "Financial plan executive summary",
  },
  {
    label: "Track your progress, update anytime",
    image: "/assets/Dashboard - Main Dashboard.svg",
    alt: "Main dashboard",
  },
  {
    label: "Download your complete plan",
    image: "/assets/Dashboard - Plan Page.svg",
    alt: "Plan page with download option",
  },
] as const;

export function ShowcaseSection() {
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
      className="bg-white px-6 py-20 lg:py-[120px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          What You Get
        </p>
        <h2
          data-animate
          className="mb-14 font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px] lg:mb-16"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          A real financial plan. A platform that grows with you.
        </h2>

        <div className="space-y-16 lg:space-y-20">
          {SHOWCASES.map((item, i) => (
            <div
              key={item.label}
              className={`flex flex-col gap-6 lg:items-center lg:gap-12 ${
                i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              }`}
            >
              <p
                data-animate
                className="order-1 max-w-xl font-display text-xl font-bold leading-snug text-text-primary sm:text-2xl lg:order-2 lg:flex-1"
                style={{ opacity: 0, transform: "translateY(16px)" }}
              >
                {item.label}
              </p>

              <div
                data-animate
                className="order-2 w-full lg:order-1 lg:flex-1"
                style={{ opacity: 0, transform: "translateY(16px)" }}
              >
                <div className="overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-lg">
                  <div className="flex items-center gap-2 border-b border-warm-200 bg-warm-100 px-4 py-3">
                    <div className="h-3 w-3 rounded-full bg-slate-300/90" />
                    <div className="h-3 w-3 rounded-full bg-slate-300/90" />
                    <div className="h-3 w-3 rounded-full bg-slate-300/90" />
                  </div>
                  <div className="relative w-full bg-white">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      width={960}
                      height={750}
                      className="h-auto w-full rounded-b-xl"
                      sizes="(min-width: 1024px) 540px, 100vw"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
