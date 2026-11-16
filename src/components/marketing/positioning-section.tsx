import { Reveal } from "@/components/marketing/reveal";

const ROWS = [
  {
    title: "Not a robo-advisor",
    body: "Robo-advisors park your money passively. Mosaic is a smart tracker for cash flow and net worth. It helps you see the whole picture. It does not manage your money.",
  },
  {
    title: "Not a calculator",
    body: "Calculators give generic numbers. Mosaic has a conversation that adapts to your situation, your province, your goals.",
  },
  {
    title: "Not financial advice",
    body: "Mosaic is a smart tracker and an education tool. Charlie teaches you about your options — it is not licensed advice. Speak with a licensed financial advisor before implementing any changes.",
  },
  {
    title: "Works alongside your advisor",
    body: "If you have one, Mosaic gives you clarity between meetings. If you do not, Mosaic helps you track and learn so you are ready when you do speak with one.",
  },
];

export function PositioningSection() {
  return (
    <section className="bg-white px-6 py-20 lg:py-[120px]">
      <Reveal threshold={0.1}>
      <div className="mx-auto max-w-[1180px]">
        <p
          data-animate
          className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.1em] text-emerald"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          How We&apos;re Different
        </p>
        <h2
          data-animate
          className="mb-14 font-display text-[28px] font-bold leading-tight text-text-primary sm:text-[38px]"
          style={{ opacity: 0, transform: "translateY(16px)" }}
        >
          What Mosaic is not.
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {ROWS.map((row) => (
            <div
              key={row.title}
              data-animate
              className="rounded-xl border border-warm-200 bg-warm-50 p-8"
              style={{ opacity: 0, transform: "translateY(16px)" }}
            >
              <h3 className="mb-2 font-display text-lg font-semibold text-text-primary">
                {row.title}
              </h3>
              <p className="font-body text-[15px] leading-relaxed text-text-secondary">
                {row.body}
              </p>
            </div>
          ))}
        </div>
      </div>
      </Reveal>
    </section>
  );
}
