"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

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

function GuideLeadForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "duplicate" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "guide", newsletter_opt_in: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        alreadySignedUp?: boolean;
      };
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong");
        return;
      }
      setStatus(data.alreadySignedUp ? "duplicate" : "success");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  if (status === "success" || status === "duplicate") {
    return (
      <div className="rounded-xl border border-emerald/30 bg-emerald/10 px-6 py-5 text-left">
        <p className="font-display text-sm font-semibold text-emerald">
          {status === "duplicate" ? "You\u2019re already on the list" : "Check your inbox"}
        </p>
        <p className="mt-2 font-body text-sm leading-relaxed text-text-muted">
          {status === "duplicate"
            ? "You\u2019re already signed up \u2014 we\u2019ll send the guide and early access updates to your email."
            : "We\u2019ll send your PDF shortly and keep you posted on Mosaic."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px]">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <label htmlFor="guide-email" className="sr-only">Email</label>
        <input
          id="guide-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          disabled={status === "submitting"}
          className="min-h-[48px] flex-1 rounded-lg border border-white/15 bg-slate-900/80 px-4 py-3 font-body text-sm text-white placeholder:text-slate-500 shadow-sm focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/30"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald px-6 font-display text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-dark disabled:opacity-60 sm:px-8"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Join the waitlist"
          )}
        </button>
      </form>
      {status === "error" && errorMessage && (
        <p className="mt-3 text-center font-body text-sm text-red-400 sm:text-left" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

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
          <p className="mt-6 font-body text-[13px] text-slate-500">
            Includes the free account guide · No credit card · Unsubscribe anytime
          </p>
        </div>
      </section>

      {/* Inside the guide */}
      <section className="border-t border-white/[0.06] px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-[640px] rounded-2xl border border-white/[0.08] bg-slate-900/50 px-6 py-8 sm:px-8 sm:py-10">
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
      </section>

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

      <Footer />
    </main>
  );
}
