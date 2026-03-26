"use client";

import { useEffect, useRef } from "react";
import { Award, Lock, MapPin } from "lucide-react";

const PILLARS = [
  {
    icon: Award,
    title: "Professionally reviewed",
    desc: "Every plan is reviewed by a registered financial professional before delivery. Not a disclaimer — a structural requirement.",
  },
  {
    icon: Lock,
    title: "Privacy-First",
    desc: "No legal name. No SIN. No account numbers. Alias-based profiles, encrypted data, Canadian data residency.",
  },
  {
    icon: MapPin,
    title: "Canadian-Specific",
    desc: "RRSP, TFSA, FHSA, CPP, OAS, provincial tax rules — built in from day one, not bolted on.",
  },
];

export function TrustSection() {
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
    <section ref={sectionRef} id="trust" className="bg-white px-6 py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Built for Trust
        </p>
        <h2
          data-animate
          className="mb-14 font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          AI that&apos;s accountable.
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                data-animate
                style={{ opacity: 0, transform: "translateY(16px)" }}
              >
                <Icon
                  className="mb-4 h-6 w-6 text-emerald"
                  strokeWidth={1.8}
                />
                <h3 className="mb-2 font-display text-lg font-semibold text-text-primary">
                  {pillar.title}
                </h3>
                <p className="font-body text-[15px] leading-relaxed text-text-secondary">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
