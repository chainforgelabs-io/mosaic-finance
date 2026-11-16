import type { ReactNode } from "react";
import {
  NetWorthDemoOnApproach,
  ReviewDemoOnApproach,
} from "@/components/marketing/demo-on-approach";
import { TRACKING_PICTURE_COPY } from "@/lib/marketing/tracking-picture";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark";

/**
 * Where the weekly logs lead: the Cash Flow Review and Net Worth, each with a
 * looping illustration. Used on the homepage (light) and the waitlist page (dark).
 */
export function TrackingPictureSection({ tone = "light" }: { tone?: Tone }) {
  const dark = tone === "dark";
  const { eyebrow, heading, intro, review, netWorth } = TRACKING_PICTURE_COPY;

  return (
    <section
      className={cn(
        "px-6",
        dark ? "border-t border-white/[0.06] py-16 sm:py-20" : "bg-warm-50 py-20 lg:py-[120px]",
      )}
    >
      <div className="mx-auto max-w-[1180px]">
        <div className={cn(dark && "mx-auto max-w-[720px] text-center")}>
          <p
            className={cn(
              "mb-4 font-body font-semibold uppercase text-emerald",
              dark ? "text-[11px] tracking-[0.14em]" : "text-xs tracking-[0.1em]",
            )}
          >
            {eyebrow}
          </p>
          <h2
            className={cn(
              "mb-4 font-display font-bold leading-tight",
              dark
                ? "text-[26px] text-white sm:text-[32px]"
                : "text-[28px] text-text-primary sm:text-[38px]",
            )}
          >
            {heading}
          </h2>
          <p
            className={cn(
              "font-body leading-relaxed",
              dark
                ? "text-[15px] text-slate-400"
                : "max-w-2xl text-[17px] text-text-secondary",
            )}
          >
            {intro}
          </p>
        </div>

        <div className="mt-12 grid gap-16 lg:mt-16 lg:grid-cols-2 lg:gap-12">
          <DemoColumn tone={tone} copy={review}>
            <ReviewDemoOnApproach tone={tone} />
          </DemoColumn>
          <DemoColumn tone={tone} copy={netWorth}>
            <NetWorthDemoOnApproach tone={tone} />
          </DemoColumn>
        </div>
      </div>
    </section>
  );
}

function DemoColumn({
  tone,
  copy,
  children,
}: {
  tone: Tone;
  copy: { eyebrow: string; title: string; body: string };
  children: ReactNode;
}) {
  const dark = tone === "dark";

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col items-center text-center">
      <p
        className={cn(
          "mb-2 font-body text-[11px] font-semibold uppercase tracking-[0.14em]",
          dark ? "text-slate-400" : "text-text-muted",
        )}
      >
        {copy.eyebrow}
      </p>
      <h3
        className={cn(
          "mb-2 font-display text-xl font-semibold leading-snug",
          dark ? "text-white" : "text-text-primary",
        )}
      >
        {copy.title}
      </h3>
      <p
        className={cn(
          "mb-8 font-body text-[15px] leading-relaxed",
          dark ? "text-slate-400" : "text-text-secondary",
        )}
      >
        {copy.body}
      </p>
      <div className="mt-auto">{children}</div>
    </div>
  );
}
