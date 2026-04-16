"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

const GUIDE_ITEMS = [
  {
    title: "RRSP vs. TFSA vs. FHSA",
    desc: "The decision tree based on your income, tax bracket, and goals",
  },
  {
    title: "Account priority order",
    desc: "Which account to max first — and when the answer changes",
  },
  {
    title: "The mistakes that cost you",
    desc: "Common allocation errors that leave thousands on the table",
  },
];

const TRUST_CHIPS = [
  "Canadian-specific",
  "Professional review",
  "Privacy-first",
  "$17/mo at launch",
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
        body: JSON.stringify({ email, source: "guide" }),
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
            "Get the free guide"
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
            Free guide + early access
          </p>
          <h1 className="mb-6 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white sm:text-[40px] lg:text-[44px]">
            Still guessing whether to use your RRSP, TFSA, or FHSA?
          </h1>
          <p className="mx-auto mb-10 max-w-[560px] font-body text-base leading-relaxed text-slate-400 sm:text-lg">
            Get the decision framework a financial planner would walk you
            through — free, instantly — plus early access to Mosaic when we
            launch.
          </p>
          <div className="flex justify-center">
            <GuideLeadForm />
          </div>
          <p className="mt-6 font-body text-[13px] text-slate-500">
            Instant PDF delivery · No credit card · Unsubscribe anytime
          </p>
        </div>
      </section>

      {/* Inside the guide */}
      <section className="border-t border-white/[0.06] px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-[640px] rounded-2xl border border-white/[0.08] bg-slate-900/50 px-6 py-8 sm:px-8 sm:py-10">
          <p className="mb-6 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald">
            Inside the guide
          </p>
          <ul className="space-y-6">
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
        </div>
      </section>

      {/* Early access */}
      <section className="border-t border-white/[0.06] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="mb-4 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald">
            What you&apos;re getting early access to
          </p>
          <h2 className="mb-6 font-display text-[26px] font-bold leading-tight text-white sm:text-[32px]">
            AI-powered financial planning for Canadians
          </h2>
          <p className="mx-auto mb-10 max-w-[560px] font-body text-base leading-relaxed text-slate-400">
            Mosaic builds you a personalized financial plan — investment
            analysis, tax strategy, retirement projections — through a
            conversation, not a form. Every plan is reviewed by a Registered
            Financial Professional before you see it.
          </p>
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
              get locked-in pricing when we launch. The waitlist is how you get
              in first.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
