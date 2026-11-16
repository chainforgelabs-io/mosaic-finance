import { Briefcase, Home, LineChart } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const CARDS = [
  {
    icon: Briefcase,
    text: "New job, raise, or career change? Update your numbers and your Score picks it up the same week.",
  },
  {
    icon: Home,
    text: "Buying a home or starting a family? Log the change, snapshot your net worth, and see the new picture.",
  },
  {
    icon: LineChart,
    text: "Market shift or rate change? Get educational context on what moved — not a trade idea.",
  },
];

export function AlwaysAvailableSection() {
  return (
    <section
      id="always-available"
      className="bg-slate-950 px-6 py-20 lg:py-[120px]"
    >
      <Reveal threshold={0.1}>
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Always Available
        </p>
        <h2
          data-animate
          className="mb-4 font-display text-[28px] font-bold leading-tight text-white sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Life changes. Your Score keeps up.
        </h2>
        <p
          data-animate
          className="mb-14 max-w-2xl font-body text-[17px] leading-relaxed text-text-muted"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          This isn&apos;t a one-time document. It&apos;s a weekly habit with a
          dashboard that knows your full picture, and a Progress Report you can
          refresh monthly when you want the why.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.text}
                data-animate
                className="rounded-xl border border-white/[0.06] bg-slate-900 p-8"
                style={{ opacity: 0, transform: "translateY(16px)" }}
              >
                <Icon
                  className="mb-4 h-6 w-6 text-emerald"
                  strokeWidth={1.8}
                />
                <p className="font-body text-[15px] leading-relaxed text-text-inverse/90">
                  {card.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      </Reveal>
    </section>
  );
}
