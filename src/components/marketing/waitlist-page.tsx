import { Suspense } from "react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { GuideLeadForm } from "@/components/marketing/guide-lead-form";
import { LoopDemo } from "@/components/marketing/loop-demo";
import { TrackingPictureSection } from "@/components/marketing/tracking-picture-section";
import { WaitlistCount } from "@/components/marketing/waitlist-count";

const TRACKER_ITEMS = [
  {
    title: "Cash flow",
    desc: "Log spending and set budgets. See the week without connecting a bank.",
  },
  {
    title: "Net worth",
    desc: "Record what you own and what you owe, then snapshot it once a month.",
  },
  {
    title: "One Financial Health Score",
    desc: "The Score follows those logs. It measures tracking consistency, not investment returns.",
  },
  {
    title: "Charlie on Progress",
    desc: "Charlie, your AI money guide, and a Progress Report explain the picture in plain language. Educational information, not advice.",
  },
];

const GUIDE_ITEMS = [
  {
    title: "How RRSP, TFSA, and FHSA differ",
    desc: "Contribution room, tax treatment, and purpose in one comparison — educational context, not a pick",
  },
  {
    title: "A snapshot you can fill in",
    desc: "CRA room, employer match, first-home eligibility, and gaps people miss when they only look at one account",
  },
  {
    title: "Questions to bring to a licensed advisor",
    desc: "So you can have a better conversation — not a to-do list from Mosaic",
  },
];

const TRUST_CHIPS = [
  "Smart tracker",
  "Cash flow and net worth",
  "Canadian-specific",
  "Privacy-first",
];

export function WaitlistPage() {
  return (
    <main className="min-h-screen bg-[#0a0d14]">
      <Nav hideAuth hideNavLinks />

      {/* Guide hero */}
      <section
        id="waitlist"
        className="scroll-mt-20 px-6 pb-16 pt-28 sm:pb-20 sm:pt-32"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      >
        <div className="mx-auto max-w-[720px] text-center">
          <p className="mb-4 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald">
            Smart tracker for Canadians
          </p>
          <h1 className="mb-6 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white sm:text-[40px] lg:text-[44px]">
            An AI-powered cash flow and net worth tracker
          </h1>
          <p className="mx-auto mb-10 max-w-[560px] font-body text-base leading-relaxed text-slate-400 sm:text-lg">
            Mosaic is a smart tracker — a personal financial operating system
            for what you spend, what you own, and what you owe. One Financial
            Health Score shows whether the week moved the right way. Join the
            waitlist and get a free guide on RRSP, TFSA, and FHSA. Educational
            information, not financial advice.
          </p>
          <div className="flex justify-center">
            <GuideLeadForm />
          </div>
          <WaitlistCount className="mt-4 font-body text-[13px] text-slate-400" />
          <p className="mt-3 font-body text-[13px] text-slate-500">
            The guide arrives by email · No credit card
          </p>
        </div>
      </section>

      <Suspense>
        {/* Inside the guide */}
        <section className="border-t border-white/[0.06] px-6 py-12 sm:py-16">
          <div className="mx-auto grid max-w-[640px] items-center gap-10 lg:max-w-[1000px] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14">
            <div className="order-2 rounded-2xl border border-white/[0.08] bg-slate-900/50 px-6 py-8 sm:px-8 sm:py-10 lg:order-1">
              <p className="mb-6 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald">
                What the tracker does
              </p>
              <ul className="space-y-6">
                {TRACKER_ITEMS.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald" aria-hidden />
                    <div>
                      <p className="font-display text-[15px] font-semibold text-white sm:text-base">
                        {item.title}
                      </p>
                      <p className="mt-1 font-body text-sm leading-relaxed text-slate-400">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <LoopDemo tone="dark" className="order-1 lg:order-2" />
          </div>
        </section>
      </Suspense>

      <Suspense>
        <TrackingPictureSection tone="dark" />
      </Suspense>

      <Suspense>
        <section className="border-t border-white/[0.06] px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-[720px]">
            <p className="mb-4 text-center font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald">
              Free with the waitlist
            </p>
            <h2 className="mb-8 text-center font-display text-[26px] font-bold leading-tight text-white sm:text-[32px]">
              A plain-language guide to RRSP, TFSA, and FHSA
            </h2>
            <ul className="mx-auto mb-10 max-w-[640px] space-y-6">
              {GUIDE_ITEMS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald" aria-hidden />
                  <div>
                    <p className="font-display text-[15px] font-semibold text-white sm:text-base">
                      {item.title}
                    </p>
                    <p className="mt-1 font-body text-sm leading-relaxed text-slate-400">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mb-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {TRUST_CHIPS.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 font-body text-xs text-slate-300 sm:text-sm"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="mx-auto max-w-[560px] rounded-xl border border-emerald/35 bg-emerald/5 px-5 py-4 text-center">
              <p className="font-body text-sm leading-relaxed text-slate-400">
                <span className="font-display font-semibold text-emerald">
                  Founding members
                </span>{" "}
                get locked-in pricing when we launch. Only 200 available. The
                waitlist is how you get in first. Educational information, not
                financial advice. Speak with a licensed financial advisor before
                implementing any changes.
              </p>
            </div>
          </div>
        </section>
      </Suspense>

      <Footer />
    </main>
  );
}
