import { LoopDemoOnApproach } from "@/components/marketing/demo-on-approach";
import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  {
    num: 1,
    title: "Log this week",
    desc: "Tap in what you spent. A few seconds on your phone, no bank login. That one habit is the whole engine.",
  },
  {
    num: 2,
    title: "Snapshot your net worth each month",
    desc: "Update your balances once a month. Your Financial Health Score moves with what you log, so you can see the direction — not just the number.",
  },
  {
    num: 3,
    title: "Let Charlie explain the picture",
    desc: "On Progress, Charlie, your AI money guide, turns your numbers into a Progress Report and walks you through it in plain Canadian terms. Educational information, not advice — speak with a licensed financial advisor before implementing changes.",
  },
];

export function SolutionSection() {
  return (
    <section
      id="how-it-works"
      className="bg-white px-6 py-20 lg:py-[120px]"
    >
      <Reveal threshold={0.1}>
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
          className="mb-4 font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          A weekly loop. Not a one-time document.
        </h2>
        <p
          data-animate
          className="mb-16 max-w-2xl font-body text-[17px] leading-relaxed text-text-secondary"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Mosaic is a smart tracker: cash flow, budgets, net worth, and one
          Financial Health Score. On Progress, Charlie explains the picture.
          Educational information, not financial advice.
        </p>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
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

          {/* Weekly loop demo (illustrative, not a user's data) */}
          <div
            data-animate
            className="flex justify-center"
            style={{ opacity: 0, transform: "translateY(16px)" }}
          >
            <LoopDemoOnApproach tone="light" />
          </div>
        </div>
      </div>
      </Reveal>
    </section>
  );
}
