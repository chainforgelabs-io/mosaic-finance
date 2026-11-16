import { Reveal } from "@/components/marketing/reveal";

const CARDS = [
  {
    title: "Too Expensive",
    stat: "$3,000–$10,000",
    subtitle: "per year for a financial advisor",
    body: "Advice is expensive. Tracking and education should not be — so you can show up prepared when you do speak with an advisor.",
  },
  {
    title: "Too Passive",
    stat: "0 conversations",
    subtitle: "with your robo-advisor last year",
    body: "Robo-advisors manage your money. They don't help you track, learn, or see your whole picture.",
  },
  {
    title: "Too Generic",
    stat: "0 personalization",
    subtitle: "from a generic AI chat",
    body: "It doesn't know your RRSP balance, your province's tax rules, or your retirement timeline — and it asks for personal data you shouldn't be sharing.",
  },
];

export function ProblemSection() {
  return (
    <section className="bg-warm-50 px-6 py-20 lg:py-[120px]">
      <Reveal>
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          The Tracking Gap
        </p>
        <h2
          data-animate
          className="mb-3 max-w-3xl font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Most people cannot say whether last month moved them forward or
          backward.
        </h2>
        <p
          data-animate
          className="mb-12 max-w-2xl font-body text-[17px] leading-relaxed text-text-secondary"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          Spending lives in your head, balances live in six apps, and nobody
          tells you the direction. Without that weekly picture, it is hard to
          know if you are paying down debt, building savings, or drifting.
          Mosaic is a smart tracker for cash flow and net worth — your
          personal financial operating system for what you spend, what you
          own, and what you owe. It is an education tool, not a substitute
          for a licensed advisor.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div
              key={card.title}
              data-animate
              className="rounded-xl border border-warm-200 bg-white p-8"
              style={{ opacity: 0, transform: "translateY(16px)" }}
            >
              <p className="mb-1 font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
                {card.title}
              </p>
              <p className="mb-1 font-display text-[32px] font-bold leading-tight text-text-primary">
                {card.stat}
              </p>
              <p className="mb-3 font-body text-[15px] text-text-secondary">
                {card.subtitle}
              </p>
              <p className="font-body text-sm text-text-muted">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
      </Reveal>
    </section>
  );
}
