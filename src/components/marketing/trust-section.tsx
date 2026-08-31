"use client";

import { useEffect, useRef } from "react";
import { Award, Lock, MapPin, Sparkles } from "lucide-react";

const PILLARS = [
  {
    icon: MapPin,
    title: "Canadian-Specific",
    desc: "RRSP, TFSA, FHSA, CPP, OAS, provincial tax rules — built in from day one, not bolted on.",
  },
  {
    icon: Award,
    title: "Education-First",
    desc: "Charlie explains your trajectory and options so you can learn. This is educational information, not financial advice — speak with a licensed advisor before implementing changes.",
  },
  {
    icon: Sparkles,
    title: "Instant Progress Reports",
    desc: "See where you stand today, your current trajectory, and educational options — delivered the moment you finish onboarding.",
  },
  {
    icon: Lock,
    title: "Privacy-First",
    desc: "No legal name. No SIN. No account numbers. Alias-based profiles, encrypted data, Canadian data residency.",
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
    <section ref={sectionRef} id="trust" className="bg-warm-50 px-6 py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Why Trust Mosaic
        </p>
        <h2
          data-animate
          className="mb-14 font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Built for Canadian financial rules. Not bolted on.
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

        <p
          data-animate
          className="mt-14 max-w-2xl rounded-xl border border-warm-200 bg-white px-6 py-5 font-display text-lg font-semibold leading-snug text-text-primary sm:text-xl"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          5.4 million Canadians have no financial advisor. Mosaic helps you track
          and learn — so you show up prepared when you do speak with one.
        </p>
      </div>
    </section>
  );
}
