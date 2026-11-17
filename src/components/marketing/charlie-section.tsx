import { DiscoveryDemoOnApproach } from "@/components/marketing/demo-on-approach";
import { CHARLIE_SECTION_COPY } from "@/lib/marketing/charlie-section";
import { cn } from "@/lib/utils";

/**
 * The paid layer, after the free tracking demos: a looping illustration of the
 * discovery chat with Charlie, and a note that Charlie comes with Progress.
 * Used on the homepage and the waitlist page. Dark on both.
 */
export function CharlieSection({ surface = "home" }: { surface?: "home" | "waitlist" }) {
  const home = surface === "home";
  const { eyebrow, heading, intro, points, progressNote } = CHARLIE_SECTION_COPY;

  return (
    <section
      id={home ? "charlie" : undefined}
      className={cn(
        "px-6",
        home
          ? "scroll-mt-20 bg-slate-950 py-20 lg:py-[120px]"
          : "border-t border-white/[0.06] py-16 sm:py-20",
      )}
    >
      <div className="mx-auto grid max-w-[1080px] gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] xl:gap-x-20">
        <div className="lg:col-start-2 lg:row-start-1">
          <p
            className={cn(
              "mb-4 font-body font-semibold uppercase text-emerald",
              home ? "text-xs tracking-[0.1em]" : "text-[11px] tracking-[0.14em]",
            )}
          >
            {eyebrow}
          </p>
          <h2
            className={cn(
              "mb-4 font-display font-bold leading-tight text-white",
              home ? "text-[28px] sm:text-[38px]" : "text-[26px] sm:text-[32px]",
            )}
          >
            {heading}
          </h2>
          <p
            className={cn(
              "font-body leading-relaxed text-slate-400",
              home ? "text-[17px]" : "text-[15px]",
            )}
          >
            {intro}
          </p>
        </div>

        <div className="flex justify-center lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
          <DiscoveryDemoOnApproach tone="dark" />
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <ul className="space-y-6">
            {points.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald" aria-hidden />
                <div>
                  <p className="font-display text-[15px] font-semibold text-white sm:text-base">
                    {point.title}
                  </p>
                  <p className="mt-1 font-body text-sm leading-relaxed text-slate-400 sm:text-[15px]">
                    {point.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border border-emerald/35 bg-emerald/5 px-5 py-4">
            <p className="font-body text-sm leading-relaxed text-slate-400">
              <span className="font-display font-semibold text-emerald">{progressNote.label}</span>{" "}
              {progressNote.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
