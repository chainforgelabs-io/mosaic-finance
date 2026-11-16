"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Plays the marketing scroll-in on `[data-animate]` children once the
 * wrapper is on screen. Keeps the surrounding section a server component.
 */
export function Reveal({
  children,
  threshold = 0.15,
  className,
}: {
  children: ReactNode;
  threshold?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const items = el.querySelectorAll<HTMLElement>("[data-animate]");
          items.forEach((item, i) => {
            window.setTimeout(() => {
              item.style.transition =
                "opacity 400ms ease-out, transform 400ms ease-out";
              item.style.opacity = "1";
              item.style.transform = "translateY(0)";
            }, i * 80);
          });
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
