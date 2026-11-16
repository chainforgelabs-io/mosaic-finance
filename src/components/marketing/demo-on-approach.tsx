"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Phone + caption + pause control. Keeps the layout from jumping when the demo mounts. */
const DEMO_MIN_HEIGHT = 580;

type DemoToneProps = { tone?: "light" | "dark"; className?: string };

function NearViewport({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("flex w-full justify-center", className)}
      style={{ minHeight: DEMO_MIN_HEIGHT }}
    >
      {show ? children : null}
    </div>
  );
}

const LoopDemoLazy = dynamic(
  () => import("@/components/marketing/loop-demo").then((mod) => mod.LoopDemo),
  { ssr: false },
);

const ReviewDemoLazy = dynamic(
  () =>
    import("@/components/marketing/review-demo").then((mod) => mod.ReviewDemo),
  { ssr: false },
);

const NetWorthDemoLazy = dynamic(
  () =>
    import("@/components/marketing/net-worth-demo").then(
      (mod) => mod.NetWorthDemo,
    ),
  { ssr: false },
);

export function LoopDemoOnApproach({ className, ...props }: DemoToneProps) {
  return (
    <NearViewport className={className}>
      <LoopDemoLazy {...props} />
    </NearViewport>
  );
}

export function ReviewDemoOnApproach({ className, ...props }: DemoToneProps) {
  return (
    <NearViewport className={className}>
      <ReviewDemoLazy {...props} />
    </NearViewport>
  );
}

export function NetWorthDemoOnApproach({ className, ...props }: DemoToneProps) {
  return (
    <NearViewport className={className}>
      <NetWorthDemoLazy {...props} />
    </NearViewport>
  );
}
